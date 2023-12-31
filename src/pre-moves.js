const { BitboardClass } = require("./bitboard")
const {
	DIAGONAL_MAGIC_NUMBERS,
	LEVEL_MAGIC_NUMBERS,
	COLOR,
	LEVEL_BITS,
	DIAGONAL_BITS,
	HORIZONTAL_ENPASSANT_BITS,
	HORIZONTAL_ENPASSANT_MAGIC_NUMBERS,
} = require("./constant-var")

const KNIGHT_JUMPS = [17, 15, 10, 6, -6, -10, -15, -17]
const DIAGONAL_DIRECTION_OFFSETS = [7, -7, 9, -9]
const LEVEL_DIRECTION_OFFSETS = [-1, 1, 8, -8]

function MaskPawnAttacksAndPush(square_index, file, push, left_attack, right_attack) {
	const bitboard_attack = new BitboardClass()

	if (file > 0) bitboard_attack.Set(square_index + left_attack)
	if (file < 7) bitboard_attack.Set(square_index + right_attack)

	return [1n << BigInt(square_index + push), bitboard_attack.Raw()]
}

function MaskKnightJumps(square_index, file, rank) {
	const bitboard = new BitboardClass()

	for (let knight_jump of KNIGHT_JUMPS) {
		const knight_jump_square = square_index + knight_jump

		if (knight_jump_square >= 0 && knight_jump_square < 64) {
			const knight_square_y = Math.floor(knight_jump_square / 8)
			const knight_square_x = Math.floor(knight_jump_square - knight_square_y * 8)

			const max_coord_move_dst = Math.max(Math.abs(file - knight_square_x), Math.abs(rank - knight_square_y))
			if (max_coord_move_dst === 2) bitboard.Set(knight_jump_square)
		}
	}

	return bitboard.Raw()
}

function GetNumberToEdge(file, rank, decrement) {
	const num_north = 7 - rank - decrement
	const num_south = rank - decrement
	const num_west = file - decrement
	const num_east = 7 - file - decrement

	const level_num_to_edge = [num_west, num_east, num_north, num_south]
	const diagonal_num_to_edge = [
		Math.min(num_north, num_west),
		Math.min(num_south, num_east),
		Math.min(num_north, num_east),
		Math.min(num_south, num_west),
	]

	return { level_num_to_edge, diagonal_num_to_edge }
}

function MaskKingMoves(square_index, file, rank) {
	const bitboard = new BitboardClass()

	const { level_num_to_edge, diagonal_num_to_edge } = GetNumberToEdge(file, rank, 0)

	for (let direction_index = 0; direction_index < 4; direction_index++) {
		if (level_num_to_edge[direction_index] > 0)
			bitboard.Set(square_index + LEVEL_DIRECTION_OFFSETS[direction_index])

		if (diagonal_num_to_edge[direction_index] > 0)
			bitboard.Set(square_index + DIAGONAL_DIRECTION_OFFSETS[direction_index])
	}

	return bitboard.Raw()
}

function MaskSlidingMoves(square_index, file, rank) {
	let level_mask = 0n
	let diagonal_mask = 0n

	const { level_num_to_edge, diagonal_num_to_edge } = GetNumberToEdge(file, rank, 1)

	for (let direction_index = 0; direction_index < 4; direction_index++) {
		const bitbaord_diagonal = new BitboardClass()
		const bitboard_level = new BitboardClass()

		//* Level mask
		for (let n = 0; n < level_num_to_edge[direction_index]; n++) {
			bitboard_level.Set(square_index + LEVEL_DIRECTION_OFFSETS[direction_index] * (n + 1))
		}

		//* Diagonal mask
		for (let n = 0; n < diagonal_num_to_edge[direction_index]; n++) {
			bitbaord_diagonal.Set(square_index + DIAGONAL_DIRECTION_OFFSETS[direction_index] * (n + 1))
		}

		level_mask |= bitboard_level.Raw()
		diagonal_mask |= bitbaord_diagonal.Raw()
	}

	return { level_mask, diagonal_mask }
}

function GenerateTargetSquareSlidingPieces(square_index, file, rank) {
	const level_squares = []
	const diagonal_squares = []

	const { level_num_to_edge, diagonal_num_to_edge } = GetNumberToEdge(file, rank, 0)

	for (let direction_index = 0; direction_index < 4; direction_index++) {
		const _level_moves = []
		const _diagonal_moves = []

		for (let n = 0; n < level_num_to_edge[direction_index]; n++) {
			const target_square = square_index + LEVEL_DIRECTION_OFFSETS[direction_index] * (n + 1)

			_level_moves.push(target_square)
		}

		for (let n = 0; n < diagonal_num_to_edge[direction_index]; n++) {
			const target_square = square_index + DIAGONAL_DIRECTION_OFFSETS[direction_index] * (n + 1)

			_diagonal_moves.push(target_square)
		}

		if (_level_moves.length > 0) level_squares.push(_level_moves)
		if (_diagonal_moves.length > 0) diagonal_squares.push(_diagonal_moves)
	}

	return { level_squares, diagonal_squares }
}

function GenerateSlidingAttacks(mask, target_squares, relevant_bits, magic_number) {
	const bits = new BitboardClass(mask).CountBits()
	const indices = 1 << bits

	const attacks = {}

	for (let index = 0; index < indices; index++) {
		const occupancies = IndexToUBigInt64(index, bits, mask)
		const magic_index = (occupancies * magic_number) >> BigInt(64 - relevant_bits)

		attacks[occupancies] = MaskSlidingAttaks(occupancies, target_squares)
	}

	return attacks
}

function GenerateHorizontalEnpassantMaskAndSquares(square_index, file) {
	const num_to_edge = [file - 1, 7 - file - 1]
	const num_to_border = [file, 7 - file]
	const mask = new BitboardClass()

	const squares = [[], []]

	for (let direction_index = 0; direction_index < 2; direction_index++) {
		for (let n = 0; n < num_to_edge[direction_index]; n++) {
			mask.Set(square_index + LEVEL_DIRECTION_OFFSETS[direction_index] * (n + 1))
		}
	}

	for (let direction_index = 0; direction_index < 2; direction_index++) {
		for (let n = 0; n < num_to_border[direction_index]; n++) {
			squares[direction_index].push(square_index + LEVEL_DIRECTION_OFFSETS[direction_index] * (n + 1))
		}
	}

	return { mask: mask.Raw(), squares }
}

function GeneratePreMovesData() {
	const pawn_push_masks = {
		[COLOR.WHITE]: new Array(64).fill(0n),
		[COLOR.BLACK]: new Array(64).fill(0n),
	}
	const pawn_double_push_mask = {
		[COLOR.WHITE]: 0n,
		[COLOR.BLACK]: 0n,
	}
	const pawn_capture_masks = {
		[COLOR.WHITE]: new Array(64).fill(0n),
		[COLOR.BLACK]: new Array(64).fill(0n),
	}

	const knight_masks = new Array(64).fill(0n)
	const king_masks = new Array(64).fill(0n)
	const level_masks = new Array(64).fill(0n)
	const diagonal_masks = new Array(64).fill(0n)
	const level_squares = new Array(64)
	const diagonal_squares = new Array(64)

	const level_attacks = new Array(64)
	const diagonal_attacks = new Array(64)

	const horizontal_enpasant_masks = {}
	const horizontal_enpassant_squares = {}
	const horizontal_enpasant_attacks = {}

	for (let file = 0; file < 8; file++) {
		for (let rank = 0; rank < 8; rank++) {
			const square_index = rank * 8 + file

			//* Pawn attacks & push
			{
				//* White push
				if (square_index < 56) {
					const [bitboard_push, bitboard_attack] = MaskPawnAttacksAndPush(square_index, file, 8, 7, 9)

					pawn_push_masks[COLOR.WHITE][square_index] = bitboard_push
					pawn_capture_masks[COLOR.WHITE][square_index] = bitboard_attack

					//* Double pawn push
					if (square_index >= 8 && square_index < 24)
						pawn_double_push_mask[COLOR.WHITE] |= 1n << BigInt(square_index)
				}

				//* Black push
				if (square_index >= 8) {
					const [bitboard_push, bitboard_attack] = MaskPawnAttacksAndPush(square_index, file, -8, -9, -7)

					pawn_push_masks[COLOR.BLACK][square_index] = bitboard_push
					pawn_capture_masks[COLOR.BLACK][square_index] = bitboard_attack

					//* Double pawn push
					if (square_index >= 40 && square_index < 56)
						pawn_double_push_mask[COLOR.BLACK] |= 1n << BigInt(square_index)
				}
			}

			//* Knight jumps
			knight_masks[square_index] = MaskKnightJumps(square_index, file, rank)

			//* King moves
			king_masks[square_index] = MaskKingMoves(square_index, file, rank)

			//* Level & Diagonal masks for magic attacks
			const premasks = MaskSlidingMoves(square_index, file, rank)
			level_masks[square_index] = premasks.level_mask
			diagonal_masks[square_index] = premasks.diagonal_mask

			//* Level & Diagonal target squares
			const target_squares = GenerateTargetSquareSlidingPieces(square_index, file, rank)
			level_squares[square_index] = target_squares.level_squares
			diagonal_squares[square_index] = target_squares.diagonal_squares

			//* Level & Diagonal attacks
			level_attacks[square_index] = GenerateSlidingAttacks(
				level_masks[square_index],
				level_squares[square_index],
				LEVEL_BITS[square_index],
				LEVEL_MAGIC_NUMBERS[square_index]
			)

			diagonal_attacks[square_index] = GenerateSlidingAttacks(
				diagonal_masks[square_index],
				diagonal_squares[square_index],
				DIAGONAL_BITS[square_index],
				DIAGONAL_MAGIC_NUMBERS[square_index]
			)

			//* Horizontal enpassant mask
			if (square_index >= 24 && square_index < 40) {
				const _data = GenerateHorizontalEnpassantMaskAndSquares(square_index, file)
				horizontal_enpasant_masks[square_index] = _data.mask
				horizontal_enpassant_squares[square_index] = _data.squares
				horizontal_enpasant_attacks[square_index] = GenerateSlidingAttacks(
					horizontal_enpasant_masks[square_index],
					horizontal_enpassant_squares[square_index],
					HORIZONTAL_ENPASSANT_BITS[square_index],
					HORIZONTAL_ENPASSANT_MAGIC_NUMBERS[square_index]
				)
			}
		}
	}

	return {
		pawn_push_masks,
		pawn_double_push_mask,
		pawn_capture_masks,
		knight_masks,
		king_masks,
		level_masks,
		diagonal_masks,
		level_squares,
		diagonal_squares,
		level_attacks,
		diagonal_attacks,
		horizontal_enpasant_masks,
		horizontal_enpassant_squares,
		horizontal_enpasant_attacks,
	}
}

const data = GeneratePreMovesData()

const pawn_push_masks = data.pawn_push_masks
const pawn_double_push_mask = data.pawn_double_push_mask
const pawn_capture_masks = data.pawn_capture_masks
const knight_masks = data.knight_masks
const king_masks = data.king_masks
const level_masks = data.level_masks
const diagonal_masks = data.diagonal_masks
const level_squares = data.level_squares
const diagonal_squares = data.diagonal_squares
const level_attacks = data.level_attacks
const diagonal_attacks = data.diagonal_attacks
const horizontal_enpasant_masks = data.horizontal_enpasant_masks
const horizontal_enpassant_squares = data.horizontal_enpassant_squares
const horizontal_enpasant_attacks = data.horizontal_enpasant_attacks

function MaskSlidingAttaks(occupancies, target_squares) {
	const bitboard_occupancies = new BitboardClass(occupancies)
	const bitboard_mask = new BitboardClass()

	for (let target_square_list of target_squares) {
		for (let target_square of target_square_list) {
			bitboard_mask.Set(target_square)

			if (bitboard_occupancies.isOccupied(target_square)) break
		}
	}

	return bitboard_mask.Raw()
}

function IndexToUBigInt64(index, bits, mask) {
	const bitboard_mask = new BitboardClass(mask)

	let result = new BitboardClass()

	for (let i = 0; i < bits; i++) {
		const square = bitboard_mask.PopLSB()

		if (index & (1 << i)) result.Or(1n << BigInt(square))
	}

	return result.Raw()
}

function GenerateMagicAttacks(level_numbers, diagonal_numbers) {
	const level = new Array(64)
	const diagonal = new Array(64)

	for (let square_index = 0; square_index < 64; square_index++) {
		level[square_index] = GenerateSlidingAttacks(
			level_masks[square_index],
			level_squares[square_index],
			LEVEL_BITS[square_index],
			level_numbers[square_index]
		)

		diagonal[square_index] = GenerateSlidingAttacks(
			diagonal_masks[square_index],
			diagonal_squares[square_index],
			DIAGONAL_BITS[square_index],
			diagonal_numbers[square_index]
		)
	}

	return { level, diagonal }
}

module.exports = {
	pawn_push_masks,
	pawn_double_push_mask,
	pawn_capture_masks,
	knight_masks,
	king_masks,
	level_masks,
	diagonal_masks,
	level_squares,
	diagonal_squares,
	level_attacks,
	diagonal_attacks,
	horizontal_enpasant_masks,
	horizontal_enpassant_squares,
	horizontal_enpasant_attacks,
	MaskSlidingAttaks,
	IndexToUBigInt64,
	GenerateMagicAttacks,
}
