const { BitboardClass } = require("./bitboard")
const {
	level_masks,
	diagonal_masks,
	level_squares,
	diagonal_squares,
	horizontal_enpasant_masks,
	horizontal_enpassant_squares,
	IndexToUBigInt64,
	MaskSlidingAttaks,
	GenerateMagicAttacks,
} = require("./pre-moves")
const {
	LEVEL_BITS,
	DIAGONAL_BITS,
	LEVEL_MAGIC_NUMBERS,
	DIAGONAL_MAGIC_NUMBERS,
	HORIZONTAL_ENPASSANT_BITS,
} = require("./constant-var")
const { GetMin, GetMax, GetMean, StopWatch, GetTotal, GetObjectSize } = require("./helper")

const LEVEL_ATTACKS_AND_OCCUPANCIES = {
	attacks: new Array(64),
	occupancies: new Array(64),
}

const DIAGONAL_ATTACKS_AND_OCCUPANCIES = {
	attacks: new Array(64),
	occupancies: new Array(64),
}

const HORIZONTAL_ENPASSANT_ATTACKS_AND_OCCUPANCIES = {
	attacks: {},
	occupancies: {},
}

function GenerateUInt16() {
	return (Math.random() * 0xffff) & 0xffff
}

function GenerateUBigInt64() {
	const u1 = BigInt(GenerateUInt16())
	const u2 = BigInt(GenerateUInt16())
	const u3 = BigInt(GenerateUInt16())
	const u4 = BigInt(GenerateUInt16())

	return u1 | (u2 << 16n) | (u3 << 32n) | (u4 << 48n)
}

function GenerateMagicNumber() {
	return GenerateUBigInt64() & GenerateUBigInt64() & GenerateUBigInt64()
}

function GenerateAttacksAndOccupancies(square_index, bits, diagonal) {
	const attack_mask = diagonal ? diagonal_masks[square_index] : level_masks[square_index]
	const target_squares = diagonal ? diagonal_squares[square_index] : level_squares[square_index]
	const number_of_bits = 1 << bits

	const attacks = new Array(number_of_bits)
	const occupancies = new Array(number_of_bits)

	for (let index = 0; index < number_of_bits; index++) {
		attacks[index] = MaskSlidingAttaks(occupancies[index], target_squares)
		occupancies[index] = IndexToUBigInt64(index, number_of_bits, attack_mask)
	}

	return { attacks, occupancies }
}

function FindMagicNumber(square_index, bits, attack_mask, object) {
	const occupancies = object.occupancies[square_index]
	const attacks = object.attacks[square_index]
	const used_attacks = {}

	for (let _ = 0; _ < 100000000; _++) {
		const magic_number = GenerateMagicNumber()
		let fail = false

		if (new BitboardClass((attack_mask * magic_number) & 0xff00000000000000n).CountBits() < 6) continue

		for (let index = 0; !fail && index < attacks.length; index++) {
			const magic_index = (occupancies[index] * magic_number) >> BigInt(64 - bits)

			if (!used_attacks[magic_index]) {
				used_attacks[magic_index] = attacks[index]
			} else if (used_attacks[magic_index] !== attacks[index]) {
				fail = true
			}
		}

		if (!fail) return magic_number
	}

	console.log("***Magic number failed***")
	return 0n
}

function Generate64ArrayMagicNumbers(print_number, bits, attack_mask, object) {
	const array_numbers = new Array(64)
	const stop_watch = StopWatch()

	for (let index = 0; index < 64; index++) {
		const index_magic_number = FindMagicNumber(index, bits[index], attack_mask[index], object)

		if (print_number) {
			console.log(`${index_magic_number}n,`)
		}

		array_numbers[index] = index_magic_number
	}

	return [array_numbers, stop_watch()]
}

function InitSliderAttacksAndOccupancies() {
	for (let square_index = 0; square_index < 64; square_index++) {
		const _level = GenerateAttacksAndOccupancies(square_index, LEVEL_BITS[square_index], false)
		LEVEL_ATTACKS_AND_OCCUPANCIES.attacks[square_index] = _level.attacks
		LEVEL_ATTACKS_AND_OCCUPANCIES.occupancies[square_index] = _level.occupancies

		const _diagonal = GenerateAttacksAndOccupancies(square_index, DIAGONAL_BITS[square_index], true)
		DIAGONAL_ATTACKS_AND_OCCUPANCIES.attacks[square_index] = _diagonal.attacks
		DIAGONAL_ATTACKS_AND_OCCUPANCIES.occupancies[square_index] = _diagonal.occupancies
	}
}

function InitSmallestMagicNumberPossible(max_loop = 5) {
	InitSliderAttacksAndOccupancies()

	const level_time = new Array(max_loop)
	const diagonal_time = new Array(max_loop)
	const generation_time = new Array(max_loop)

	let level_numbers = structuredClone(LEVEL_MAGIC_NUMBERS)
	let diagonal_numbers = structuredClone(DIAGONAL_MAGIC_NUMBERS)

	const attacks = GenerateMagicAttacks(level_numbers, diagonal_numbers)
	let level_size = GetObjectSize(attacks.level)
	let diagonal_size = GetObjectSize(attacks.diagonal)

	for (let i = 0; i < max_loop; i++) {
		const stop_watch = StopWatch()
		const level = Generate64ArrayMagicNumbers(false, LEVEL_BITS, level_masks, LEVEL_ATTACKS_AND_OCCUPANCIES)
		const diagonal = Generate64ArrayMagicNumbers(
			false,
			DIAGONAL_BITS,
			diagonal_masks,
			DIAGONAL_ATTACKS_AND_OCCUPANCIES
		)
		generation_time[i] = stop_watch()

		const _attacks = GenerateMagicAttacks(level[0], diagonal[0])
		const _level_size = GetObjectSize(_attacks.level)
		const _diagonal_size = GetObjectSize(_attacks.diagonal)

		if (_level_size < level_size) {
			level_numbers = level[0]
			level_size = _level_size

			console.log(`Level size: ${(_level_size / 1024).toFixed(2)}`)
		}

		if (_diagonal_size < diagonal_size) {
			diagonal_numbers = diagonal[0]
			diagonal_size = _diagonal_size

			console.log(`Diagonal size: ${(_diagonal_size / 1024).toFixed(2)}`)
		}

		level_time[i] = level[1]
		diagonal_time[i] = diagonal[1]
	}

	console.log(`\nGeneartion complete in: ${GetTotal(generation_time).toFixed(3)}s`)
	console.log(`Minimum: ${GetMin(generation_time).toFixed(3)}s`)
	console.log(`Maximum: ${GetMax(generation_time).toFixed(3)}s`)
	console.log(`Mean: ${GetMean(generation_time).toFixed(3)}s`)

	console.log(`\nLevel Mean: ${GetMean(level_time).toFixed(3)}s`)
	console.log(`Diagonal Mean: ${GetMean(diagonal_time).toFixed(3)}s`)

	console.log("\nLevel magic numbers")
	level_numbers.forEach((magic) => {
		console.log(`${magic}n,`)
	})

	console.log("\nDiagonal magic numbers")
	diagonal_numbers.forEach((magic) => {
		console.log(`${magic}n,`)
	})

	return
}

function InitMagicNumbers(show_numbers = false) {
	InitSliderAttacksAndOccupancies()

	console.log("Level magic numbers")
	const level_numbers = Generate64ArrayMagicNumbers(
		show_numbers,
		LEVEL_BITS,
		level_masks,
		LEVEL_ATTACKS_AND_OCCUPANCIES
	)[0]

	console.log("\nDiagonal magic numbers")
	const diagonal_numbers = Generate64ArrayMagicNumbers(
		show_numbers,
		DIAGONAL_BITS,
		diagonal_masks,
		DIAGONAL_ATTACKS_AND_OCCUPANCIES
	)[0]

	const attacks = GenerateMagicAttacks(level_numbers, diagonal_numbers)

	console.log(`\nLevel size: ${(GetObjectSize(attacks.level) / 1024).toFixed(2)}kb`)
	console.log(`Diagonal size: ${(GetObjectSize(attacks.diagonal) / 1024).toFixed(2)}kb`)
	console.log("\nMagic number generation complete")
}

function InitHorizontalMagicNumbers() {
	for (let square_index = 24; square_index < 40; square_index++) {
		const bits = HORIZONTAL_ENPASSANT_BITS[square_index]
		const attack_mask = horizontal_enpasant_masks[square_index]
		const number_of_bits = 1 << bits

		const occupancies = new Array(number_of_bits)
		const attacks = new Array(number_of_bits)

		for (let index = 0; index < number_of_bits; index++) {
			occupancies[index] = IndexToUBigInt64(index, number_of_bits, attack_mask)
			attacks[index] = MaskSlidingAttaks(occupancies[index], horizontal_enpassant_squares[square_index] ?? [[]])
		}

		HORIZONTAL_ENPASSANT_ATTACKS_AND_OCCUPANCIES.occupancies[square_index] = occupancies
		HORIZONTAL_ENPASSANT_ATTACKS_AND_OCCUPANCIES.attacks[square_index] = attacks

		const index_magic_number = FindMagicNumber(
			square_index,
			bits,
			attack_mask,
			HORIZONTAL_ENPASSANT_ATTACKS_AND_OCCUPANCIES
		)

		console.log(`${square_index}: ${index_magic_number}n,`)
	}
}

module.exports = {
	MaskSlidingAttaks,
	IndexToUBigInt64,
	InitSmallestMagicNumberPossible,
	InitMagicNumbers,
	InitHorizontalMagicNumbers,
}
