const COLOR = {
	WHITE: 0,
	BLACK: 1,
}

const PIECES = {
	KING: 0,
	PAWN: 1,
	KNIGHT: 2,
	BISHOP: 3,
	ROOK: 4,
	QUEEN: 5,
}

const PIECE_FROM_CHARACTER = {
	k: PIECES.KING,
	p: PIECES.PAWN,
	n: PIECES.KNIGHT,
	b: PIECES.BISHOP,
	r: PIECES.ROOK,
	q: PIECES.QUEEN,
}

const PIECE_TYPE_FROM_VALUE = {
	[PIECES.KING]: "k",
	[PIECES.PAWN]: "p",
	[PIECES.KNIGHT]: "n",
	[PIECES.BISHOP]: "b",
	[PIECES.ROOK]: "r",
	[PIECES.QUEEN]: "q",
}

const CASTLE_RIGHTS = {
	K: 1,
	Q: 2,
	k: 4,
	q: 8,
}

const CASLTE_ROOK_POSITIONS = {
	[CASTLE_RIGHTS.K]: 0x80n,
	[CASTLE_RIGHTS.Q]: 0x1n,
	[CASTLE_RIGHTS.k]: 0x8000000000000000n,
	[CASTLE_RIGHTS.q]: 0x100000000000000n,
}

const CASTLE_KING_MOVED = {
	[COLOR.WHITE]: [~CASTLE_RIGHTS.K, ~CASTLE_RIGHTS.Q],
	[COLOR.BLACK]: [~CASTLE_RIGHTS.k, ~CASTLE_RIGHTS.q],
}

const CASTLE_ROOK_MOVED = {
	7: CASTLE_RIGHTS.K,
	0: CASTLE_RIGHTS.Q,
	63: CASTLE_RIGHTS.k,
	56: CASTLE_RIGHTS.q,
}

const CASTLE_RIGHTS_ROOK_SQUARE_INDEX = {
	[CASTLE_RIGHTS.K]: [7, 5],
	[CASTLE_RIGHTS.Q]: [0, 3],
	[CASTLE_RIGHTS.k]: [63, 61],
	[CASTLE_RIGHTS.q]: [56, 59],
}

const CASTLE_EMPTY_OCCUPANCIES = {
	[COLOR.WHITE]: [
		[CASTLE_RIGHTS.K, 0x60n],
		[CASTLE_RIGHTS.Q, 0xen],
	],
	[COLOR.BLACK]: [
		[CASTLE_RIGHTS.k, 0x6000000000000000n],
		[CASTLE_RIGHTS.q, 0xe00000000000000n],
	],
}

const CASTLE_ATTACKED_MASK = {
	[CASTLE_RIGHTS.K]: 0x60n,
	[CASTLE_RIGHTS.Q]: 0xcn,
	[CASTLE_RIGHTS.k]: 0x6000000000000000n,
	[CASTLE_RIGHTS.q]: 0xc00000000000000n,
}

const CASTLE_SQUARE_INDEX = {
	[CASTLE_RIGHTS.K]: 6,
	[CASTLE_RIGHTS.Q]: 2,
	[CASTLE_RIGHTS.k]: 62,
	[CASTLE_RIGHTS.q]: 58,
}

const PROMOTION_PIECES = [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT]

const PAWN_SHIFT_DIRECTION = {
	[COLOR.WHITE]: "LeftShift",
	[COLOR.BLACK]: "RightShift",
}

const PAWN_MOVE_DIRECTION = {
	[COLOR.WHITE]: 8,
	[COLOR.BLACK]: -8,
}

const PAWN_PROMOTION_MASK = {
	[COLOR.WHITE]: 0xff00000000000000n,
	[COLOR.BLACK]: 0xffn,
}

const MOVE_INFO = {
	DOUBLE_PAWN_PUSH: 1,
	ENPASSANT: 2,
	CASTLE: 4,
	PROMOTION: 8,
}

// prettier-ignore
const NOTATIONS = [
	"a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1",
	"a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2",
	"a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3",
	"a4", "b4", "c4", "d4", "e4", "f4", "g4", "h4",
	"a5", "b5", "c5", "d5", "e5", "f5", "g5", "h5",
	"a6", "b6", "c6", "d6", "e6", "f6", "g6", "h6",
	"a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7",
	"a8", "b8", "c8", "d8", "e8", "f8", "g8", "h8",
]

const INDEX_FROM_NOTATION = {}

//* Initailize INDEX_FROM_NOTATION
Object.entries(NOTATIONS).forEach(([index, notation]) => {
	INDEX_FROM_NOTATION[notation] = Number(index)
})

// prettier-ignore
const LEVEL_BITS = [
	12, 11, 11, 11, 11, 11, 11, 12,
	11, 10, 10, 10, 10, 10, 10, 11,
	11, 10, 10, 10, 10, 10, 10, 11,
	11, 10, 10, 10, 10, 10, 10, 11,
	11, 10, 10, 10, 10, 10, 10, 11,
	11, 10, 10, 10, 10, 10, 10, 11,
	11, 10, 10, 10, 10, 10, 10, 11,
	12, 11, 11, 11, 11, 11, 11, 12
]
// prettier-ignore
const DIAGONAL_BITS = [
	6, 5, 5, 5, 5, 5, 5, 6,
	5, 5, 5, 5, 5, 5, 5, 5,
	5, 5, 7, 7, 7, 7, 5, 5,
	5, 5, 7, 9, 9, 7, 5, 5,
	5, 5, 7, 9, 9, 7, 5, 5,
	5, 5, 7, 7, 7, 7, 5, 5,
	5, 5, 5, 5, 5, 5, 5, 5,
	6, 5, 5, 5, 5, 5, 5, 6
]

// prettier-ignore
const HORIZONTAL_ENPASSANT_BITS = [
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	6, 5, 5, 5, 5, 5, 5, 6,
	6, 5, 5, 5, 5, 5, 5, 6,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0
]

const LEVEL_MAGIC_NUMBERS = [
	144115462953844736n,
	4690500116048642048n,
	11531466897422422144n,
	145401067058757648n,
	290500328697364480n,
	166633220572446744n,
	2305863625224488960n,
	4612820714427289602n,
	1909597173457094800n,
	4616198827068620800n,
	2311474707905511808n,
	22518015319740692n,
	576478490736463424n,
	576742227347245121n,
	4633082514704040000n,
	2342047764600885248n,
	21999363703040n,
	2323875017370665040n,
	1352346529901420673n,
	4611756404351721738n,
	1154127669147730944n,
	144132781403275296n,
	4899933987168331778n,
	578784570265043082n,
	14606848229386n,
	10556441959096909888n,
	72128014322239616n,
	2412329048228420n,
	4612253675673356322n,
	2311052495339683940n,
	72058968964340354n,
	1171554000720494864n,
	38298773140541449n,
	2160070656n,
	13991593877165834752n,
	4433488386048n,
	36028797053161472n,
	72622021477565192n,
	643215107555844n,
	81064896371884388n,
	9289250025512961n,
	844442714128388n,
	289357392752149572n,
	83404554040772352n,
	9224709044073332736n,
	142938693960712n,
	4612248971065169152n,
	4683818388391202817n,
	297870928631644676n,
	2341924586020537360n,
	145250158954742016n,
	18124351819764224n,
	1126724542793792n,
	88373247312148n,
	579014368599998464n,
	5782736348062616064n,
	18867636980940992n,
	288377852444278848n,
	10531738097358995490n,
	2306126683228340228n,
	9376781396722336385n,
	1478293719106563n,
	7322748515254288n,
	72093054398365768n,
]

const DIAGONAL_MAGIC_NUMBERS = [
	1153203563835432980n,
	4614431501109493760n,
	289778496039813128n,
	3865472664456n,
	1157567014248662024n,
	9275233802060300288n,
	1130693358796800n,
	72252210826715138n,
	307954550675996800n,
	2386909473315913729n,
	27171288263950336n,
	45036340982580336n,
	598825816293404n,
	1127069212739588n,
	288583186273828992n,
	9223373557410572416n,
	9007482756210976n,
	9228441905371677696n,
	6825854085629185n,
	74309393870521376n,
	4918071531784904704n,
	306262376645132484n,
	562951296778258n,
	9259707606212018242n,
	292597912565710848n,
	577024546486552576n,
	72116984858542244n,
	4684025246373216773n,
	2305847407260270848n,
	1194019067679212032n,
	289998468695458056n,
	153123486843275811n,
	315842411660116036n,
	35202089890568n,
	1441169477243909272n,
	4612249004898517505n,
	1162069442423947264n,
	2308094809161736706n,
	110338639711503360n,
	81242914722153538n,
	4611721361990091137n,
	9042568447000592n,
	2323857893055277376n,
	9295500000794509440n,
	4399187363840n,
	4647717237830976898n,
	580966001483579520n,
	3377725541711945n,
	360292445680043008n,
	36038147166175248n,
	12411964845631607296n,
	882712678622113801n,
	145161422135296n,
	13836219139855747072n,
	4612248998731911296n,
	18863221578662913n,
	2598739712713957376n,
	576751664615129106n,
	576460855995400192n,
	1152934724517250064n,
	37225340552122880n,
	9529687233964540416n,
	14988131928283027970n,
	589976498990219269n,
]

const HORIZONTAL_ENPASSANT_MAGIC_NUMBERS = {
	24: 26942329847808n,
	25: 1760045420513284n,
	26: 5044594603475664962n,
	27: 216313589479383048n,
	28: 9243638529383464962n,
	29: 48519597002850304n,
	30: 9023434768007552n,
	31: 577023719571062784n,
	32: 90071992555864144n,
	33: 4917939623885408296n,
	34: 9223653511865307152n,
	35: 576460753646649344n,
	36: 9223372041762185346n,
	37: 4611791574238495809n,
	38: 9007216501997568n,
	39: 4701762752635469824n,
}

module.exports = {
	COLOR,
	PIECES,
	PIECE_FROM_CHARACTER,
	PIECE_TYPE_FROM_VALUE,
	CASTLE_RIGHTS,
	CASLTE_ROOK_POSITIONS,
	CASTLE_KING_MOVED,
	CASTLE_ROOK_MOVED,
	CASTLE_RIGHTS_ROOK_SQUARE_INDEX,
	CASTLE_EMPTY_OCCUPANCIES,
	CASTLE_ATTACKED_MASK,
	CASTLE_SQUARE_INDEX,
	PROMOTION_PIECES,
	PAWN_SHIFT_DIRECTION,
	PAWN_MOVE_DIRECTION,
	PAWN_PROMOTION_MASK,
	MOVE_INFO,
	NOTATIONS,
	INDEX_FROM_NOTATION,
	LEVEL_BITS,
	DIAGONAL_BITS,
	HORIZONTAL_ENPASSANT_BITS,
	LEVEL_MAGIC_NUMBERS,
	DIAGONAL_MAGIC_NUMBERS,
	HORIZONTAL_ENPASSANT_MAGIC_NUMBERS,
}
