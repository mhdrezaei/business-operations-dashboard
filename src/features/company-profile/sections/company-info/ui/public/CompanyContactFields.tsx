import type { DragEndEvent } from "@dnd-kit/core";
import type { CSSProperties, ReactNode } from "react";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { DeleteOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Form, Input } from "antd";
import React from "react";
import { useController, useFormContext } from "react-hook-form";
import "./company-contact-fields.css";

interface ContactMethodCardProps {
	title: string
	icon?: ReactNode
	children: ReactNode
	className?: string
}

interface SortableContactFieldProps {
	name: string
	label: string
	icon?: ReactNode
	disabled?: boolean
}

interface SortableContactRowProps {
	id: string
	index: number
	label: string
	value: string
	disabled: boolean
	onBlur: () => void
	onChange: (value: string) => void
	onRemove: () => void
}

function getErrorMessage(error: unknown): string | undefined {
	if (!error)
		return undefined;
	if (typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string")
		return (error as { message: string }).message;
	if (Array.isArray(error))
		return getErrorMessage(error.find(Boolean));
	return undefined;
}

export function ContactMethodCard({ title, icon, children, className }: ContactMethodCardProps) {
	return (
		<section className={`company-contact-card${className ? ` ${className}` : ""}`} aria-label={title}>
			<DashedBorder />
			<div className="company-contact-card__content">
				<div className="company-contact-card__title">
					{icon ? <span className="company-contact-card__title-icon" aria-hidden="true">{icon}</span> : null}
					<span>{title}</span>
				</div>
				{children}
			</div>
		</section>
	);
}

function SortableContactRow({
	id,
	index,
	label,
	value,
	disabled,
	onBlur,
	onChange,
	onRemove,
}: SortableContactRowProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, disabled });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	} as CSSProperties;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`company-contact-row${isDragging ? " company-contact-row--dragging" : ""}`}
		>
			<Button
				type="text"
				className="company-contact-row__handle"
				disabled={disabled}
				icon={<HolderOutlined />}
				aria-label={`جابجایی ${label} با اولویت ${index + 1}`}
				{...attributes}
				{...listeners}
			/>
			<span className="company-contact-row__priority" aria-label={`اولویت ${index + 1}`}>
				{index + 1}
			</span>
			<Input
				disabled={disabled}
				value={value}
				placeholder={label}
				aria-label={`${label} با اولویت ${index + 1}`}
				onBlur={onBlur}
				onChange={event => onChange(event.target.value)}
			/>
			<Button
				danger
				disabled={disabled}
				icon={<DeleteOutlined />}
				onClick={onRemove}
			>
				حذف
			</Button>
		</div>
	);
}

export default function SortableContactField({ name, label, icon, disabled = false }: SortableContactFieldProps) {
	const { control, formState } = useFormContext();
	const { field } = useController({ control, name });
	const values = Array.isArray(field.value) ? field.value as string[] : [];
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);
	const itemIds = values.map((_, index) => `${name}-${index}`);
	const errorMessage = getErrorMessage((formState.errors as Record<string, unknown>)[name]);

	function updateValues(nextValues: string[]) {
		field.onChange(nextValues);
	}

	function handleDragEnd({ active, over }: DragEndEvent) {
		if (!over || active.id === over.id)
			return;
		const oldIndex = itemIds.indexOf(String(active.id));
		const newIndex = itemIds.indexOf(String(over.id));
		if (oldIndex < 0 || newIndex < 0)
			return;
		updateValues(arrayMove(values, oldIndex, newIndex));
	}

	return (
		<ContactMethodCard title={label} icon={icon}>
			<Form.Item validateStatus={errorMessage ? "error" : ""} help={errorMessage}>
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
						<div className="company-contact-list">
							{values.map((value, index) => (
								<SortableContactRow
									key={itemIds[index]}
									id={itemIds[index]}
									index={index}
									label={label}
									value={value}
									disabled={disabled}
									onBlur={field.onBlur}
									onChange={nextValue => updateValues(values.map((item, itemIndex) => itemIndex === index ? nextValue : item))}
									onRemove={() => updateValues(values.filter((_, itemIndex) => itemIndex !== index))}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
				<Button
					type="dashed"
					className="company-contact-card__add"
					disabled={disabled}
					icon={<PlusOutlined />}
					onClick={() => updateValues([...values, ""])}
				>
					افزودن مقدار
				</Button>
			</Form.Item>
		</ContactMethodCard>
	);
}
