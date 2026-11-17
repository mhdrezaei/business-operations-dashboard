import { render, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { RHFSelect } from "./RHFSelect";

interface Values { kind: string | null }

function Harness({ initial, options, selectProps, autoSelectSingle, onValues }: {
	initial: string | null
	options: { label: string, value: string }[]
	selectProps?: Record<string, unknown>
	autoSelectSingle?: boolean
	onValues: (value: string | null) => void
}) {
	const form = useForm<Values>({ defaultValues: { kind: initial } });
	onValues(form.watch("kind"));
	return (
		<FormProvider {...form}>
			<RHFSelect<Values, "kind"> name="kind" label="kind" options={options} selectProps={selectProps} autoSelectSingle={autoSelectSingle} />
		</FormProvider>
	);
}

function track() {
	const box: { current: string | null } = { current: null };
	return { set: (v: string | null) => void (box.current = v), value: () => box.current };
}

const one = [{ label: "A", value: "a" }];
const two = [...one, { label: "B", value: "b" }];

describe("rHFSelect single-option auto-select", () => {
	it("selects the only option when the value is empty", async () => {
		const seen = track();
		render(<Harness initial={null} options={one} onValues={seen.set} />);
		await waitFor(() => expect(seen.value()).toBe("a"));
	});

	it("does nothing when there are several options", () => {
		const seen = track();
		render(<Harness initial={null} options={two} onValues={seen.set} />);
		expect(seen.value()).toBeNull();
	});

	it("keeps an existing value instead of replacing it", () => {
		const seen = track();
		render(<Harness initial="legacy" options={one} onValues={seen.set} />);
		expect(seen.value()).toBe("legacy");
	});

	it("skips clearable (optional), multiple and disabled selects", () => {
		const seen = track();
		const onValues = seen.set;
		render(<Harness initial={null} options={one} selectProps={{ allowClear: true }} onValues={onValues} />);
		render(<Harness initial={null} options={one} selectProps={{ mode: "multiple" }} onValues={onValues} />);
		render(<Harness initial={null} options={one} selectProps={{ disabled: true }} onValues={onValues} />);
		expect(seen.value()).toBeNull();
	});

	it("can be turned off explicitly", () => {
		const seen = track();
		render(<Harness initial={null} options={one} autoSelectSingle={false} onValues={seen.set} />);
		expect(seen.value()).toBeNull();
	});
});
