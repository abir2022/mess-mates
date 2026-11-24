/**
 * The opening position of every chess room. It lives outside `ChessGame` on
 * purpose: `Arena` only needs this string, and importing it from the component
 * would pull `chess.js` (and the whole board) into the Arena route bundle.
 */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
