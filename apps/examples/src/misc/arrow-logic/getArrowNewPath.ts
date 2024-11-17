import { Box, Vec } from 'tldraw'

type GridPosition = [number, number]

type Dir = 't' | 'r' | 'b' | 'l'

interface GridNode {
	vec: Vec
	x: number
	y: number
	f: number
	g: number
	h: number
	e: number
	d?: 't' | 'r' | 'b' | 'l' | 'any'
	parent: GridNode | null
}

export interface ArrowGuide {
	// Center of gap
	c: GridNode
	// Center of A
	Ac: GridNode
	// Center of B
	Bc: GridNode
	// Middle handle
	M: GridNode
	// Padding amount
	p: number
	grid: GridNode[][]
	map: Map<GridNode, GridPosition>
	startNodes: {
		t: GridNode
		r: GridNode
		b: GridNode
		l: GridNode
	}
	endNodes: {
		t: GridNode
		r: GridNode
		b: GridNode
		l: GridNode
	}
	A: Box
	B: Box
	bannedNodes: Set<GridNode>
	path: Vec[]
}

export function getArrowGuide({
	A,
	B,
	M,
	p,
	start,
	end: _,
}: {
	A: Box
	B: Box
	M: Vec
	start: 't' | 'r' | 'b' | 'l' | 'any'
	end: 't' | 'r' | 'b' | 'l' | 'any'
	p: number
}) {
	const g: ArrowGuide = {
		grid: [],
		map: new Map(),
		startNodes: {} as any,
		endNodes: {} as any,
		bannedNodes: new Set(),
		path: [],
		p,
		c: {} as any,
		Ac: {} as any,
		Bc: {} as any,
		M: {} as any,
		A,
		B,
	}

	// collect all of the points in the grid
	const xs = [
		A.minX,
		A.midX,
		A.maxX,
		B.minX,
		B.midX,
		B.maxX,
		A.minX - p,
		A.maxX + p,
		B.minX - p,
		B.maxX + p,
		M.x,
	]

	const ys = [
		A.minY,
		A.midY,
		A.maxY,
		B.minY,
		B.midY,
		B.maxY,
		A.minY - p,
		A.maxY + p,
		B.minY - p,
		B.maxY + p,
		M.y,
	]

	let cx = A.midX
	let cy = A.midY

	if (A.maxX < B.minX && A.maxX < B.minX) {
		// A left of B
		cx = (A.maxX + B.minX) / 2
		xs.push(cx)
	} else if (A.maxX < B.maxX && A.maxX > B.minX) {
		if (A.minX > B.minX) {
			// A within B, noop
			cx = A.midX
		} else {
			// A partially left of B
			cx = (B.maxX + B.minX) / 2
			xs.push(cx)
		}
	} else if (A.maxX > B.maxX) {
		if (A.minX < B.minX) {
			// A contains B, noop
			cx = A.midX
		} else {
			// A partially right of B
			cx = (A.minX + B.maxX) / 2
			xs.push(cx)
		}
	}

	if (A.maxY < B.minY && A.maxY < B.minY) {
		// A above B
		cy = (A.maxY + B.minY) / 2
		ys.push(cy)
	} else if (A.maxY < B.maxY && A.maxY > B.minY) {
		if (A.minY > B.minY) {
			// A within B, noop
			cy = A.midY
		} else {
			// A partially above B
			cy = (B.maxY + B.minY) / 2
			ys.push(cy)
		}
	} else if (A.maxY > B.maxY) {
		if (A.minY < B.minY) {
			// A contains B, noop
			cy = A.midY
		} else {
			// A partially below B
			cy = (A.minY + B.maxY) / 2
			ys.push(cy)
		}
	}

	xs.sort((a, b) => a - b)
	ys.sort((a, b) => a - b)

	// populate grid and map
	for (let y = 0; y < ys.length; y++) {
		g.grid[y] = []
		for (let x = 0; x < xs.length; x++) {
			g.grid[y][x] = {
				vec: new Vec(xs[x], ys[y]),
				x,
				y,
				g: Infinity,
				h: 0,
				f: 0,
				e: 0,
				parent: null,
			}
			g.map.set(g.grid[y][x], [x, y])
		}
	}

	g.c = g.grid[ys.indexOf(cy)][xs.indexOf(cx)]
	g.Ac = g.grid[ys.indexOf(A.midY)][xs.indexOf(A.midX)]
	g.Bc = g.grid[ys.indexOf(B.midY)][xs.indexOf(B.midX)]
	g.M = g.grid[ys.indexOf(M.y)][xs.indexOf(M.x)]

	// populate start and end nodes
	for (let i = 0; i < g.grid.length; i++) {
		for (let j = 0; j < g.grid[i].length; j++) {
			const node = g.grid[i][j]
			if (node.vec.x === A.midX && node.vec.y === A.minY) g.startNodes['t'] = node
			if (node.vec.x === A.midX && node.vec.y === A.maxY) g.startNodes['b'] = node
			if (node.vec.x === A.minX && node.vec.y === A.midY) g.startNodes['l'] = node
			if (node.vec.x === A.maxX && node.vec.y === A.midY) g.startNodes['r'] = node
			if (node.vec.x === B.midX && node.vec.y === B.minY) g.endNodes['t'] = node
			if (node.vec.x === B.midX && node.vec.y === B.maxY) g.endNodes['b'] = node
			if (node.vec.x === B.minX && node.vec.y === B.midY) g.endNodes['l'] = node
			if (node.vec.x === B.maxX && node.vec.y === B.midY) g.endNodes['r'] = node
			if (
				// (node.vec.x >= A.minX - p &&
				// 	node.vec.x <= A.maxX + p &&
				// 	node.vec.y >= A.minY - p &&
				// 	node.vec.y <= A.maxY + p) ||
				node.vec.x >= B.minX - p &&
				node.vec.x <= B.maxX + p &&
				node.vec.y >= B.minY - p &&
				node.vec.y <= B.maxY + p
			) {
				g.bannedNodes.add(node)
			}
		}
	}

	// console.log(path)

	// const startingNodes = start === 'any' ? Object.entries(g.startNodes) : [g.startNodes[start]]
	// const paths = startingNodes.map(([d, n]: any) => {
	// 	const firstStage = aStarAlgorithm(g, n, d, 0, [])
	// 	const secondStage = aStarAlgorithm(g, g.M, g.M.d!, 1, firstStage)
	// 	return [...firstStage, ...secondStage]
	// })
	const firstStage = aStarAlgorithm(g, g.Ac, [g.Bc])
	const path = [...firstStage]

	// const path = naivePathing(g, [g.Ac, g.M, g.Bc])
	// const path = expensivePath(g, g.Ac, g.M, g.Bc)

	// const pathToShow = paths.sort((a, b) => a.length - b.length)[0]

	// const pathToShow = paths.map(p => p.vec!)
	if (path) g.path = path.map((n) => n.vec)

	return g
}

const DIRS = ['t', 'r', 'b', 'l'] as const

function aStarAlgorithm(g: ArrowGuide, start: GridNode, targets: GridNode[]): GridNode[] {
	const openSet = new Set<GridNode>()
	const closedSet = new Set<GridNode>()

	// Reset nodes
	for (let y = 0; y < g.grid.length; y++) {
		for (let x = 0; x < g.grid[y].length; x++) {
			const node = g.grid[y][x]
			node.g = Infinity
			node.h = 0
			node.f = 0
			node.e = 0
			node.parent = null
			delete node.d
		}
	}

	// Initialize start node
	start.g = 0
	start.h = getHeuristic(g, start, targets)
	start.f = start.g + start.h
	start.d = 'any'
	start.e = 0
	openSet.add(start)

	while (openSet.size > 0) {
		let current: GridNode | undefined

		openSet.forEach((node) => {
			if (!current) {
				current = node
			} else {
				if (node.f < current.f) {
					current = node
				}
			}
		})

		if (!current) {
			throw Error('No current node')
		}

		if (targets.includes(current)) {
			current.e++
		}

		if (current === targets[targets.length - 1]) {
			return reconstructPath(current)
		}

		openSet.delete(current)
		closedSet.add(current)

		const neighbors = getNeighbors(g, current)

		for (let i = 0; i < 4; i++) {
			const neighbor = neighbors[i]
			const dir = DIRS[i]
			start.d = dir

			if (!neighbor || closedSet.has(neighbor)) {
				continue
			}

			const isElbow = dir !== current.d
			if (isElbow && g.A.containsPoint(neighbor.vec)) {
				continue
			}

			const tentativeG = current.g + 1

			if (!openSet.has(neighbor)) {
				openSet.add(neighbor)
			} else if (tentativeG >= neighbor.g) {
				continue
			}

			// if targets include current, bump some number like e

			// Update neighbor scores
			neighbor.parent = current
			neighbor.g = tentativeG
			neighbor.h = getHeuristic(g, neighbor, targets)
			neighbor.f = neighbor.g + neighbor.h
			neighbor.d = dir
			neighbor.e = current.e
		}
	}

	return []
}

function mtDist(a: GridNode, b: GridNode) {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function rawDist(a: GridNode, b: GridNode) {
	return Vec.Dist(a.vec, b.vec)
}

function getHeuristic(g: ArrowGuide, node: GridNode, targets: GridNode[]): number {
	const distanceToNext = mtDist(node, targets[node.e])
	return distanceToNext

	// = Math.min(...Math.abs(node.x - target.x) + Math.abs(node.y - target.y)

	// 	const los = Math.min(
	// 			if (end.x === node.x) {
	// 				return 0
	// 			}
	// 			if (end.y === node.y) {
	// 				return 0
	// 			}
	// 			return 10
	// }
	// 	)
}

function reconstructPath(endNode: GridNode): GridNode[] {
	const path: GridNode[] = []
	let current: GridNode | null = endNode

	while (current) {
		path.unshift(current)
		current = current.parent
	}

	return path
}

function getNeighbors(g: ArrowGuide, node: GridNode) {
	return DIRS.map((d) => getAdjacentNode(g, node, d))
}

function getAdjacentNode(
	g: ArrowGuide,
	node: GridNode,
	dir: 't' | 'r' | 'b' | 'l'
): GridNode | undefined {
	const pos = g.map.get(node)!
	const tpos = [pos[0], pos[1]] as GridPosition
	if (dir === 't') tpos[1]--
	if (dir === 'b') tpos[1]++
	if (dir === 'l') tpos[0]--
	if (dir === 'r') tpos[0]++
	const next = g.grid[tpos[1]]?.[tpos[0]]
	return next
}

function naivePathing(g: ArrowGuide, points: GridNode[]): GridNode[] {
	// a path through g.grid that passes through each point in points
	const path: GridNode[] = []

	let i = 0
	let k = 0
	let complete = false

	const visited = new Set<GridNode>()

	path.push(points[i])
	let current = points[i]

	while (!complete) {
		const next = points[i + 1]

		if (!next) {
			complete = true
			break
		}
		k++
		const neighbors = getNeighbors(g, current)
		let minDist = Infinity
		let nearest: GridNode | undefined

		for (const neighbor of neighbors) {
			if (!neighbor) continue
			// if (visited.has(neighbor)) continue
			// visited.add(neighbor)
			if (path.includes(neighbor)) continue
			const dist = mtDist(neighbor, next)
			if (dist < minDist) {
				minDist = dist
				nearest = neighbor
			}
		}

		if (!nearest) {
			break
		}

		if (nearest) {
			path.push(nearest)
			current = nearest
		}

		if (current === next) {
			i++
		}
	}

	return path
}

function expensivePath(g: ArrowGuide, start: GridNode, mid: GridNode, target: GridNode) {
	const paths = next(g, start, 0, [mid, target], new Set(), [], -1, 0)
	if (!paths) return
	return (
		paths
			// .map((p) => p.filter((v) => !g.bannedNodes.has(v)))
			.sort((a, b) => a.length - b.length)[0]
	)
}

function next(
	g: ArrowGuide,
	node: GridNode,
	targetIndex: number,
	targets: GridNode[],
	visited: Set<GridNode>,
	path: GridNode[],
	dir: number,
	turns: number
): GridNode[][] | undefined {
	if (g.B.containsPoint(node.vec)) {
		return [[...path, node]]
	}

	path.push(node)
	visited.add(node)

	let target = targets[targetIndex]
	if (node === target) {
		if (targetIndex === targets.length - 1) {
			return [path]
		} else {
			targetIndex++
			target = targets[targetIndex]
		}
	}

	if (turns > 4) {
		return
	}

	const neighbors = getNeighbors(g, node)
	const paths: GridNode[][] = []

	for (let i = 0; i < 4; i++) {
		if (path.length === 3 && i !== dir) continue
		const neighbor = neighbors[i]
		if (!neighbor) continue
		if (visited.has(neighbor)) continue
		if (mtDist(neighbor, target) > mtDist(node, target)) continue

		const nextPath = [...path]
		if (dir === i) nextPath.pop()

		const results = next(
			g,
			neighbor,
			targetIndex,
			targets,
			new Set(visited),
			nextPath,
			i,
			i === dir ? turns : turns + 1
		)
		if (!results) continue
		paths.push(...results)
	}

	return paths
}
