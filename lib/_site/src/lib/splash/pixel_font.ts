// tiny bitmap font for the splash wordmark.
// each glyph is 9 rows: 0-1 ascender, 2-6 x-height, 7-8 descender.

const GLYPHS: Record<string, string[]> = {
	t: [".#..", ".#..", "####", ".#..", ".#..", ".#..", "..##", "....", "...."],
	w: [".....", ".....", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#.", ".....", "....."],
	i: ["#", ".", "#", "#", "#", "#", "#", ".", "."],
	n: [".....", ".....", "#.##.", "##..#", "#...#", "#...#", "#...#", ".....", "....."],
	k: ["#...", "#...", "#..#", "#.#.", "##..", "#.#.", "#..#", "....", "...."],
	l: ["#", "#", "#", "#", "#", "#", "#", ".", "."],
	e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###.", ".....", "....."],
	p: [".....", ".....", "####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
	o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###.", ".....", "....."],
};

const ROWS = 9;
const SPACING = 1;
const SPACE_WIDTH = 3;

export interface pixel_cell {
	x: number;
	y: number;
}

export interface pixel_layout {
	cells: pixel_cell[];
	cols: number;
	rows: number;
}

export function layout(text: string): pixel_layout {
	const cells: pixel_cell[] = [];
	let x = 0;
	for (const ch of text.toLowerCase()) {
		const glyph = GLYPHS[ch];
		if (!glyph) {
			x += SPACE_WIDTH;
			continue;
		}
		let width = 0;
		for (let ry = 0; ry < glyph.length; ry++) {
			const row = glyph[ry];
			for (let rx = 0; rx < row.length; rx++) {
				if (row[rx] !== "#") continue;
				cells.push({ x: x + rx, y: ry });
				if (rx + 1 > width) width = rx + 1;
			}
		}
		x += width + SPACING;
	}
	return { cells, cols: Math.max(1, x - SPACING), rows: ROWS };
}
