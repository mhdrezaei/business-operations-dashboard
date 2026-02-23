import type { ContractListItemType } from "../../model/contracts.list.types";

type ContractDetailDto = Record<string, any>;

interface BuildContractPdfArgs {
	record: ContractListItemType
	detail: ContractDetailDto
}

const MONTH_LABELS: Record<number, string> = {
	1: "فروردین",
	2: "اردیبهشت",
	3: "خرداد",
	4: "تیر",
	5: "مرداد",
	6: "شهریور",
	7: "مهر",
	8: "آبان",
	9: "آذر",
	10: "دی",
	11: "بهمن",
	12: "اسفند",
};

function escapeHtml(value: unknown) {
	return String(value ?? "-")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function toNumber(value: unknown): number | null {
	if (value == null || value === "")
		return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function formatFaNumber(value: unknown) {
	const n = toNumber(value);
	if (n == null)
		return "-";
	return new Intl.NumberFormat("fa-IR").format(n);
}

function formatFaDate(y: unknown, m: unknown) {
	const year = toNumber(y);
	const month = toNumber(m);
	if (!year || !month)
		return "-";
	return `${formatFaNumber(year)} ${MONTH_LABELS[month] ?? "-"}`;
}

function formatDateRange(
	startY: unknown,
	startM: unknown,
	endY: unknown,
	endM: unknown,
) {
	return `${formatFaDate(startY, startM)} تا ${formatFaDate(endY, endM)}`;
}

function labelByCalculationType(type: unknown) {
	const raw = String(type ?? "").toUpperCase();
	if (raw === "FLAT")
		return "ثابت";
	if (raw === "TIER_SINGLE")
		return "پلکانی ثابت";
	if (raw === "TIER_PROGRESSIVE")
		return "پلکانی متغیر";
	if (raw === "TIER_MIXED")
		return "تلفیقی";
	return "-";
}

function renderPricingTableRows(tiers: any[]) {
	if (!tiers.length) {
		return "<tr><td colspan=\"3\">داده‌ای ثبت نشده است.</td></tr>";
	}

	return tiers
		.map(t => `<tr>
		<td>${escapeHtml(formatFaNumber(t?.min_inclusive))}</td>
		<td>${escapeHtml(formatFaNumber(t?.max_exclusive))}</td>
		<td>${escapeHtml(formatFaNumber(t?.rate_per_unit))}</td>
	</tr>`)
		.join("");
}

function renderPricingBox(title: string, pricing: any) {
	const calculationType = labelByCalculationType(pricing?.calculation_type);
	const tiers = Array.isArray(pricing?.tiers) ? pricing.tiers : [];

	return `<section class="card">
		<div class="card-head">
			<h3>${escapeHtml(title)}</h3>
			<span class="muted">${escapeHtml(`نوع: ${calculationType}`)}</span>
		</div>
		<table>
			<thead>
				<tr>
					<th>حداقل</th>
					<th>حداکثر</th>
					<th>نرخ (تومان)</th>
				</tr>
			</thead>
			<tbody>
				${renderPricingTableRows(tiers)}
			</tbody>
		</table>
	</section>`;
}

function renderPackagePricing(title: string, tiers: any[], selector: (tier: any) => any) {
	const rows = tiers.length
		? tiers.map((tier) => {
			const rate = selector(tier);
			return `<tr>
				<td>${escapeHtml(formatFaNumber(tier?.sms_min_inclusive ?? tier?.bill_min_inclusive))}</td>
				<td>${escapeHtml(formatFaNumber(tier?.sms_max_exclusive ?? tier?.bill_max_exclusive))}</td>
				<td>${escapeHtml(formatFaNumber(rate?.tiers?.[0]?.rate_per_unit))}</td>
			</tr>`;
		}).join("")
		: "<tr><td colspan=\"3\">داده‌ای ثبت نشده است.</td></tr>";

	return `<section class="card">
		<div class="card-head">
			<h3>${escapeHtml(title)}</h3>
			<span class="muted">نوع: بسته‌ای</span>
		</div>
		<table>
			<thead>
				<tr>
					<th>حداقل</th>
					<th>حداکثر</th>
					<th>نرخ (تومان)</th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>
	</section>`;
}

function resolvePricingSections(detail: ContractDetailDto) {
	const contractDetails = detail?.contract_openapi_details ?? detail?.contractOpenapiDetails ?? null;
	const contractModel = String(
		contractDetails?.contract_model
		?? contractDetails?.contractModel
		?? "",
	).toUpperCase();

	if (contractModel === "PACKAGE") {
		const tiers = Array.isArray(contractDetails?.package_model?.tiers)
			? contractDetails.package_model.tiers
			: [];

		return [
			renderPackagePricing("استعلام قبض", tiers, tier => tier?.bill_inquiry_rate),
			renderPackagePricing("ثبت وصولی", tiers, tier => tier?.sms_sale_rate),
		].join("");
	}

	const billInquiry = contractDetails?.bill_inquiry ?? detail?.bill_inquiry ?? null;
	const receiptRegister = contractDetails?.receipt_register ?? detail?.receipt_register ?? null;

	return [
		renderPricingBox("استعلام قبض", billInquiry),
		renderPricingBox("ثبت وصولی", receiptRegister),
	].join("");
}

function renderAddenda(detail: ContractDetailDto) {
	const addenda = Array.isArray(detail?.addenda) ? detail.addenda : [];
	if (!addenda.length) {
		return "<p class=\"empty\">الحاقیه‌ای برای این قرارداد ثبت نشده است.</p>";
	}

	return `<div class="addenda-list">${addenda.map((item: any, index: number) => {
		const description = item?.description ?? item?.note ?? "-";
		return `<article class="addenda-item">
			<div class="addenda-title">الحاقیه ${escapeHtml(formatFaNumber(index + 1))}</div>
			<div class="addenda-desc">${escapeHtml(description)}</div>
			<div class="muted">${escapeHtml(formatDateRange(item?.start_jy, item?.start_jm, item?.end_jy, item?.end_jm))}</div>
		</article>`;
	}).join("")}</div>`;
}

function buildContractHtml({ record, detail }: BuildContractPdfArgs) {
	const origin = window.location.origin;
	const contractId = detail?.id ?? record.id;
	const companyName = detail?.company?.name ?? record.company_name ?? "-";
	const serviceName = detail?.service?.name ?? record.service_name ?? "-";
	const description = detail?.note ?? "-";
	const today = new Date().toLocaleDateString("fa-IR");

	return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>قرارداد-${escapeHtml(contractId)}</title>
	<style>
		@font-face {
			font-family: "IranYekan";
			src: url("${origin}/fonts/woff/iranyekanwebregularfanum.woff") format("woff");
			font-weight: 400;
		}
		@font-face {
			font-family: "IranYekan";
			src: url("${origin}/fonts/woff/iranyekanwebmediumfanum.woff") format("woff");
			font-weight: 500;
		}
		@font-face {
			font-family: "IranYekan";
			src: url("${origin}/fonts/woff/iranyekanwebboldfanum.woff") format("woff");
			font-weight: 700;
		}
		* { box-sizing: border-box; }
		body {
			margin: 0;
			background: #f6f8fd;
			color: #1f2a44;
			font-family: "IranYekan", Tahoma, Arial, sans-serif;
			padding: 24px;
		}
		.container {
			max-width: 920px;
			margin: 0 auto;
		}
		.sheet {
			background: #fff;
			border: 1px solid #dbe4f5;
			border-radius: 14px;
			padding: 20px;
		}
		.header {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 16px;
			border: 1px solid #dbe4f5;
			border-radius: 12px;
			padding: 14px 16px;
		}
		.brand {
			font-weight: 700;
			font-size: 20px;
			color: #375dfb;
		}
		.meta {
			text-align: left;
			font-size: 12px;
			color: #6b7280;
		}
		.h2 {
			font-size: 19px;
			font-weight: 700;
			margin: 18px 0 12px;
			color: #1f2a44;
		}
		.grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px 20px;
			margin-top: 10px;
		}
		.label { color: #6b7280; font-size: 13px; }
		.value { font-size: 14px; font-weight: 500; margin-top: 2px; }
		.card {
			border: 1px solid #dbe4f5;
			border-radius: 12px;
			padding: 12px;
			margin-bottom: 10px;
		}
		.card-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 10px;
			gap: 8px;
		}
		h3 { margin: 0; font-size: 16px; font-weight: 700; }
		table {
			width: 100%;
			border-collapse: collapse;
			font-size: 13px;
		}
		th, td {
			border: 1px solid #dbe4f5;
			padding: 8px;
			text-align: center;
		}
		th { background: #f8faff; font-weight: 700; }
		.muted { color: #6b7280; font-size: 12px; }
		.empty { margin: 0; color: #6b7280; font-size: 13px; }
		.addenda-list { display: grid; gap: 10px; }
		.addenda-item {
			border: 1px dashed #cdd9f2;
			border-radius: 10px;
			padding: 10px 12px;
		}
		.addenda-title {
			font-size: 14px;
			font-weight: 700;
			margin-bottom: 4px;
		}
		.addenda-desc { font-size: 13px; margin-bottom: 4px; }
		@media print {
			body { background: #fff; padding: 0; }
			.container { max-width: 100%; }
			.sheet { border: none; border-radius: 0; padding: 12px; }
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="sheet">
			<section class="header">
				<div>
					<div class="brand">قرارداد</div>
					<div class="muted">شناسه: ${escapeHtml(contractId)}</div>
				</div>
				<div class="meta">
					<div>تاریخ تولید: ${escapeHtml(today)}</div>
				</div>
			</section>

			<h2 class="h2">جزئیات قرارداد و الحاقیه‌ها</h2>
			<section class="card">
				<div class="grid">
					<div><div class="label">شرکت</div><div class="value">${escapeHtml(companyName)}</div></div>
					<div><div class="label">سرویس</div><div class="value">${escapeHtml(serviceName)}</div></div>
					<div><div class="label">شروع قرارداد</div><div class="value">${escapeHtml(formatFaDate(detail?.start_jy ?? record.start_jy, detail?.start_jm ?? record.start_jm))}</div></div>
					<div><div class="label">پایان قرارداد</div><div class="value">${escapeHtml(formatFaDate(detail?.end_jy ?? record.end_jy, detail?.end_jm ?? record.end_jm))}</div></div>
					<div><div class="label">تعداد الحاقیه</div><div class="value">${escapeHtml(formatFaNumber(record.addenda_count ?? (Array.isArray(detail?.addenda) ? detail.addenda.length : 0)))}</div></div>
					<div><div class="label">توضیحات</div><div class="value">${escapeHtml(description)}</div></div>
				</div>
			</section>

			<h2 class="h2">جزئیات اصلی قرارداد</h2>
			${resolvePricingSections(detail)}

			<h2 class="h2">الحاقیه‌ها</h2>
			${renderAddenda(detail)}
		</div>
	</div>
</body>
</html>`;
}

export function openContractPdfPrint(args: BuildContractPdfArgs) {
	const win = window.open("", "_blank", "width=1100,height=860");
	if (!win) {
		throw new Error("POPUP_BLOCKED");
	}

	const html = buildContractHtml(args);
	win.document.open();
	win.document.write(html);
	win.document.close();

	setTimeout(() => {
		win.focus();
		win.print();
	}, 350);
}
