import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({
	// نوع انيميشن
	easing: "ease",
	// سرعت انيميشن، واحد: ميلي ثانيه
	speed: 500,
	// آيا آيکن نمايش داده شود
	showSpinner: false,
	// سرعت افزايش خودکار
	trickleSpeed: 200,
	// حداقل درصد پيشرفت
	minimum: 0.3,
});

export { NProgress };
