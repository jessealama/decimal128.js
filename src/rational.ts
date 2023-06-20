const zero = BigInt(0);
const ten = BigInt(10);

type Digit = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // -1 signals that we're moving from the integer part to the decimal part of a decimal number

function gcd(a: bigint, b: bigint): bigint {
    while (b !== zero) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

function countSignificantDigits(s: string): number {
    if (s.match(/^-/)) {
        return countSignificantDigits(s.substring(1));
    }

    if (s.match(/^0+[1-9]$/)) {
        return countSignificantDigits(s.replace(/^0+/, ""));
    }

    if (s.match(/^0[.]/)) {
        let m = s.match(/[.]0+/);

        if (m) {
            return s.length - m[0].length - 1;
        }

        return s.length - 2;
    }

    if (s.match(/[.]/)) {
        return s.length - 1;
    }

    let m = s.match(/0+$/);

    if (m) {
        return s.length - m[0].length;
    }

    return s.length;
}

function* nextDigitForDivision(
    x: bigint,
    y: bigint,
    n: number
): Generator<Digit> {
    let result = "0";
    let emittedDecimalPoint = false;
    let done = false;

    while (
        !done &&
        countSignificantDigits(
            result.match(/[.]$/) ? result.replace(".", "") : result
        ) < n
    ) {
        if (x === zero) {
            done = true;
        } else if (x < y) {
            if (emittedDecimalPoint) {
                x = x * ten;
                if (x < y) {
                    // look ahead: are we still a power of 10 behind?
                    result = result + "0";
                    yield 0;
                }
            } else {
                emittedDecimalPoint = true;
                result = result + ".";
                x = x * ten;
                yield -1;
                if (x < y) {
                    // look ahead: are we still a power of 10 behind?
                    result = result + "0";
                    yield 0;
                }
            }
        } else {
            let q = x / y;
            x = x % y;
            let qString = q.toString();
            result = result + qString;
            for (let i = 0; i < qString.length; i++) {
                yield parseInt(qString.charAt(i)) as Digit;
            }
        }
    }

    return 0;
}

export class Rational {
    readonly numerator: bigint;
    readonly denominator: bigint;
    readonly isNegative: boolean;

    constructor(p: bigint, q: bigint) {
        if (q === zero) {
            throw new RangeError(
                "Cannot construct rational whose denominator is zero"
            );
        }

        let num = p;
        let den = q;
        let neg = false;

        if (p < zero) {
            if (q < zero) {
                num = -p;
                den = -q;
            } else {
                num = -p;
                neg = true;
            }
        } else if (q < zero) {
            den = -q;
            neg = true;
        }

        let g = gcd(num, den);
        this.numerator = p / g;
        this.denominator = q / g;
        this.isNegative = neg;
    }

    public toString(): string {
        return `${this.isNegative ? "-" : ""}${this.numerator}/${
            this.denominator
        }`;
    }

    private static _add(x: Rational, y: Rational): Rational {
        return new Rational(
            x.numerator * y.denominator + y.numerator * x.denominator,
            x.denominator * y.denominator
        );
    }

    private static _subtract(x: Rational, y: Rational): Rational {
        return new Rational(
            x.numerator * y.denominator - y.numerator * x.denominator,
            x.denominator * y.denominator
        );
    }

    private static _multiply(x: Rational, y: Rational): Rational {
        return new Rational(
            x.numerator * y.numerator,
            x.denominator * y.denominator
        );
    }

    private static _divide(x: Rational, y: Rational): Rational {
        return new Rational(
            x.numerator * y.denominator,
            x.denominator * y.numerator
        );
    }

    public static add(x: Rational, ...theArgs: Rational[]): Rational {
        return theArgs.reduce((acc, cur) => Rational._add(acc, cur), x);
    }

    public static subtract(x: Rational, ...theArgs: Rational[]): Rational {
        return theArgs.reduce((acc, cur) => Rational._subtract(acc, cur), x);
    }

    public static multiply(x: Rational, ...theArgs: Rational[]): Rational {
        return theArgs.reduce((acc, cur) => Rational._multiply(acc, cur), x);
    }

    public static divide(x: Rational, ...theArgs: Rational[]): Rational {
        return theArgs.reduce((acc, cur) => Rational._divide(acc, cur), x);
    }

    public negate(): Rational {
        return new Rational(-this.numerator, this.denominator);
    }

    public toDecimalPlaces(n: number): string {
        if (!Number.isInteger(n)) {
            throw new TypeError(
                "Cannot round to non-integer number of decimal places"
            );
        }

        if (n < 0) {
            throw new RangeError(
                "Cannot round to negative number of decimal places"
            );
        }

        let numerator = this.numerator;
        let denominator = this.denominator;

        if (numerator === zero) {
            return "0";
        }

        if (numerator < 0) {
            if (denominator < 0) {
                numerator = -numerator;
                denominator = -denominator;
            } else {
                numerator = -numerator;
            }
        } else if (denominator < 0) {
            denominator = -denominator;
        }

        let digitGenerator = nextDigitForDivision(numerator, denominator, n);
        let digit = digitGenerator.next();
        let result = "";
        while (!digit.done) {
            let v = digit.value;
            if (-1 === v) {
                result = ("" === result ? "0" : result) + ".";
            } else {
                result = result + `${v}`;
            }

            digit = digitGenerator.next();
        }

        return (this.isNegative ? "-" : "") + result;
    }
}
