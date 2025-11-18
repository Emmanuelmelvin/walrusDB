Start
  = _ gen:Generator? _ models:Model+ _ {
      return {
        generator: gen || {},
        models: Object.fromEntries(models)
      };
    }

// GENERATOR
Generator
  = "generator" __ name:Identifier __ "{" _ url:GeneratorUrl _ "}" {
      return { [name]: { url } };
    }

GeneratorUrl
  = "url" __ value:StringLiteral {
      return value;
    }

// MODEL
Model
  = "model" __ name:Identifier __ "{" _ fields:FieldList? _ "}" _ {
      return [name, Object.fromEntries(fields || [])];
    }

FieldList
  = first:Field rest:(_ Field)* {
      return [first, ...rest.map(r => r[1])];
    }

Field
  = name:Identifier __ type:TypeAttr _ {
      return [name, type];
    }

// TYPES (optional + arrays)
TypeAttr
  = base:Identifier array:"[]"?
    optional:"?"? {

      // base + array + optional → return structured info
      if (array && optional) {
        return { type: base, isArray: true, optional: true };
      } else if (array) {
        return { type: base, isArray: true };
      } else if (optional) {
        return { type: base, optional: true };
      } else {
        return base;
      }
    }

// STRING LITERAL
StringLiteral
  = '"' chars:([^"]*) '"' { return chars.join(""); }

// IDENTIFIER
Identifier
  = $([a-zA-Z_][a-zA-Z0-9_]*)

// WHITESPACE
_ = [ \t\r\n]*
__ = [ \t\r\n]+
