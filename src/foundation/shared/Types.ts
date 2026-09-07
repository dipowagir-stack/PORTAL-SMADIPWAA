export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = string;
export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [member: string]: JSONValue };
export type JSONArray = Array<JSONValue>;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
