import { theme } from "antd";
// src/features/contract-templates/create/TemplateCreateModal.tsx
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { VariableRegistryProvider } from "./components/editor/variables/VariableRegistryContext";
import TemplateCreateLayout from "./TemplateCreateLayout";

interface TemplateCreateModalProps {
	isOpen: boolean
	onClose: () => void
	originPosition: { x: number, y: number }
}

export default function TemplateCreateModal({ isOpen, onClose, originPosition }: TemplateCreateModalProps) {
	// دریافت توکن‌های رنگی استاندارد از تم پروژه
	const { token } = theme.useToken();

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		}
		else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	const modalContent = (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{
						clipPath: `circle(0px at ${originPosition.x}px ${originPosition.y}px)`,
						opacity: 0,
					}}
					animate={{
						clipPath: `circle(150% at ${originPosition.x}px ${originPosition.y}px)`,
						opacity: 1,
					}}
					exit={{
						clipPath: `circle(0px at ${originPosition.x}px ${originPosition.y}px)`,
						opacity: 0,
					}}
					transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
					className="fixed inset-0 z-[9999] overflow-hidden"
					// اعمال یکپارچه رنگ پس‌زمینه و متن بر اساس تم Antd پروژه
					style={{
						backgroundColor: token.colorBgLayout,
						color: token.colorText,
					}}
				>
					<VariableRegistryProvider kind="contract" documentKind="contract">

						<TemplateCreateLayout onClose={onClose} />
					</VariableRegistryProvider>
				</motion.div>
			)}
		</AnimatePresence>
	);

	return createPortal(modalContent, document.body);
}
