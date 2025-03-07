
import {
    ObjectType,
    ValueType,
    StringType,
    NumberType,
    BooleanType,
    checkSubtype,
    typeToString,
    array
} from '../types';
import {RuntimeError} from '../runtime_error';
import {typeOf} from '../values';

import type {Expression} from '../expression';
import type {ParsingContext} from '../parsing_context';
import type {EvaluationContext} from '../evaluation_context';
import type {Type} from '../types';

const types = {
    string: StringType,
    number: NumberType,
    boolean: BooleanType,
    object: ObjectType
};

export class Assertion implements Expression {
    type: Type;
    args: Array<Expression>;

    constructor(type: Type, args: Array<Expression>) {
        this.type = type;
        this.args = args;
    }

    static parse(args: ReadonlyArray<unknown>, context: ParsingContext): Expression {
        if (args.length < 2)
            return context.error('Expected at least one argument.') as null;

        let i = 1;
        let type;

        const name: string = (args[0] as any);
        if (name === 'array') {
            let itemType;
            if (args.length > 2) {
                const type = args[1];
                if (typeof type !== 'string' || !(type in types) || type === 'object')
                    return context.error('The item type argument of "array" must be one of string, number, boolean', 1) as null;
                itemType = types[type];
                i++;
            } else {
                itemType = ValueType;
            }

            let N;
            if (args.length > 3) {
                if (args[2] !== null &&
                    (typeof args[2] !== 'number' ||
                        args[2] < 0 ||
                        args[2] !== Math.floor(args[2]))
                ) {
                    return context.error('The length argument to "array" must be a positive integer literal', 2) as null;
                }
                N = args[2];
                i++;
            }

            type = array(itemType, N);
        } else {
            if (!types[name]) throw new Error(`Types doesn't contain name = ${name}`);
            type = types[name];
        }

        const parsed = [];
        for (; i < args.length; i++) {
            const input = context.parse(args[i], i, ValueType);
            if (!input) return null;
            parsed.push(input);
        }

        return new Assertion(type, parsed);
    }

    evaluate(ctx: EvaluationContext) {
        for (let i = 0; i < this.args.length; i++) {
            const value = this.args[i].evaluate(ctx);
            const error = checkSubtype(this.type, typeOf(value));
            if (!error) {
                return value;
            } else if (i === this.args.length - 1) {
                throw new RuntimeError(`Expected value to be of type ${typeToString(this.type)}, but found ${typeToString(typeOf(value))} instead.`);
            }
        }

        throw new Error();
    }

    eachChild(fn: (_: Expression) => void) {
        this.args.forEach(fn);
    }

    outputDefined(): boolean {
        return this.args.every(arg => arg.outputDefined());
    }
}
