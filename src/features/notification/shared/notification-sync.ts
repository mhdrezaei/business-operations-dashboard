const NOTIFICATION_SYNC_KEY = "notification-sync";

function buildPayload() {
	return JSON.stringify({
		ts: Date.now(),
	});
}

export function emitNotificationSync() {
	try {
		localStorage.setItem(NOTIFICATION_SYNC_KEY, buildPayload());
	}
	catch {
		// ignore storage failures
	}
}

export function subscribeNotificationSync(listener: () => void) {
	const handleStorage = (event: StorageEvent) => {
		if (event.key !== NOTIFICATION_SYNC_KEY)
			return;
		listener();
	};

	window.addEventListener("storage", handleStorage);
	return () => {
		window.removeEventListener("storage", handleStorage);
	};
}
