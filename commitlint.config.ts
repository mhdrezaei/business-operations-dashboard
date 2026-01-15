import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
	// الگوی هدر: JIRA - (type) - subject
	parserPreset: {
		parserOpts: {
			headerPattern: /^([A-Z][A-Z0-9]+-\d+)\s-\s\(([^)]+)\)\s-\s(.+)$/,
			headerCorrespondence: ["ticket", "type", "subject"],
		},
	},

	plugins: [
		{
			rules: {
				// اگر body وجود داشت، هر خط باید با "-" شروع شود
				"body-lines-start-with-dash": ({ body }) => {
					// body اختیاری است
					if (!body || !body.trim())
						return [true];

					const lines = body
						.split("\n")
						.map(l => l.trim())
						.filter(l => l.length > 0);

					const invalid = lines.filter(l => !l.startsWith("-"));

					if (invalid.length > 0) {
						return [
							false,
							`Body lines must start with "-". Invalid lines: ${invalid.slice(0, 3).join(" | ")}${
								invalid.length > 3 ? " ..." : ""
							}`,
						];
					}

					return [true];
				},
			},
		},
	],

	rules: {
		// هدر باید دقیقاً با الگوی بالا match شود
		"header-match-team-pattern": [2, "always"],

		// type نباید خالی باشد و باید از enum باشد
		"type-empty": [2, "never"],
		"type-enum": [
			2,
			"always",
			[
				"feat",
				"fix",
				"perf",
				"style",
				"docs",
				"test",
				"refactor",
				"build",
				"ci",
				"chore",
				"revert",
				"wip",
				"workflow",
				"types",
				"release",
			],
		],

		// subject نباید خالی باشد
		"subject-empty": [2, "never"],

		// Body اجباری نیست
		"body-empty": [0],

		// اگر body هست، بهتره بعد از هدر یک خط خالی باشد (اختیاری، پیشنهاد حرفه‌ای)
		"body-leading-blank": [2, "always"],

		// Footer اجباری نیست + قوانین مربوط به فاصله فوتر را خاموش می‌کنیم
		"footer-leading-blank": [0],

		// محدودیت طول هدر
		"header-max-length": [2, "always", 108],

		// اجرای rule سفارشی body
		"body-lines-start-with-dash": [2, "always"],
	},
};

export default config;
