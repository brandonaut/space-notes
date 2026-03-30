interface ToastProps {
	message: string | null;
	color?: string;
}

export function Toast({ message, color }: ToastProps) {
	return (
		<div
			className={`fixed bottom-6 left-1/2 bg-lead text-white px-5 py-2.5 rounded-full text-sm font-semibold z-[999] whitespace-nowrap ${message ? "toast-enter" : "toast-exit"}`}
			style={color ? { background: color } : undefined}
		>
			{message}
		</div>
	);
}
