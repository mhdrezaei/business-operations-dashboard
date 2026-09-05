import { usePreferencesStore } from "#src/store";

interface LayoutFooterProps {
	className?: string
}
export default function LayoutFooter({ className }: LayoutFooterProps) {
	const enableFooter = usePreferencesStore(state => state.enableFooter);
	if (!enableFooter)
		return null;

	return <div className={className} aria-hidden="true" />;
}
