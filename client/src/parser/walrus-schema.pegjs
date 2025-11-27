// ========================
// Walrus Schema PEG Grammar
// ========================

// Entry point
Start
  = _ gen:Generator? _ models:Model+ _ {
      return {
        generator: gen || {},
        models: Object.fromEntries(models)
      };
    }

// ========================
// GENERATOR
Generator
  = "generator" __ name:Identifier __ "{" _ url:GeneratorUrl _ "}" {
      return { [name]: { url } };
    }

GeneratorUrl
  = "url" __ value:StringLiteral _ { return value; }

// ========================
// MODELS
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

// ========================
// TYPES (optional + arrays)
TypeAttr
  = base:Identifier array:"[]"? optional:"?"? {
      return {
        type: base,
        ...(array ? { isArray: true } : {}),
        ...(optional ? { optional: true } : {})
      };
    }

// ========================
// STRING LITERALS
StringLiteral
  = '"' chars:([^"]*) '"' { return chars.join(""); }

// ========================
// IDENTIFIERS
Identifier
  = $([a-zA-Z_][a-zA-Z0-9_]*)

// ========================
// WHITESPACE
_  = [ \t\r\n]*       // optional whitespace
__ = [ \t\r\n]+       // required whitespace
