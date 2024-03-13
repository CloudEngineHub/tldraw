import { StateNode, TLBaseBoxShape, TLEventHandlers, Vec, createShapeId } from '@tldraw/editor'
import { BaseBoxShapeTool } from '../BaseBoxShapeTool'

export class Pointing extends StateNode {
	static override id = 'pointing'

	markId = ''

	wasFocusedOnEnter = false

	override onEnter = () => {
		this.wasFocusedOnEnter = !this.editor.getIsMenuOpen()
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			const { originPagePoint } = this.editor.inputs

			const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType

			const id = createShapeId()

			this.markId = `creating:${id}`

			this.editor.mark(this.markId)

			this.editor
				.createShapes<TLBaseBoxShape>([
					{
						id,
						type: shapeType,
						x: originPagePoint.x,
						y: originPagePoint.y,
						props: {
							w: 1,
							h: 1,
						},
					},
				])
				.select(id)
			this.parent.transition('creating', {
				shape: this.editor.getShape<TLBaseBoxShape>(id)!,
				handle: 'bottom_right',
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.cancel()
	}

	complete() {
		const { originPagePoint } = this.editor.inputs

		if (!this.wasFocusedOnEnter) {
			return
		}

		this.editor.mark(this.markId)

		const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType as TLBaseBoxShape['type']

		const id = createShapeId()

		this.editor.mark(this.markId)

		this.editor.createShapes<TLBaseBoxShape>([
			{
				id,
				type: shapeType,
				x: originPagePoint.x,
				y: originPagePoint.y,
			},
		])

		const shape = this.editor.getShape<TLBaseBoxShape>(id)!
		const { w, h } = this.editor.getShapeUtil(shape).getDefaultProps() as TLBaseBoxShape['props']
		const delta = new Vec(w / 2, h / 2)

		const parentTransform = this.editor.getShapeParentTransform(shape)
		if (parentTransform) delta.rot(-parentTransform.rotation())

		this.editor.updateShapes<TLBaseBoxShape>([
			{
				id,
				type: shapeType,
				x: shape.x - delta.x,
				y: shape.y - delta.y,
			},
		])

		this.editor.setSelectedShapes([id])

		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			this.editor.setCurrentTool('select.idle')
		}
	}

	cancel() {
		this.parent.transition('idle')
	}
}