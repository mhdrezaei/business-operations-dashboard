```ts
import { defineFakeRoute } from "vite-plugin-fake-server/client";

import { resultSuccess } from "./utils";

export default defineFakeRoute([
	{
		url: "/logout",
		timeout: 1000,
		method: "post",
		response: () => resultSuccess({}),
	},
]);
```
