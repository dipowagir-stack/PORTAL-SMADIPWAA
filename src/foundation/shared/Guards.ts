import { Nullable } from './Types';

export const isNullOrUndefined = <T>(value: Nullable<T> | undefined): value is null | undefined => {
  return value === null || value === undefined;
};

export const isObject = (value: any): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isArray = (value: any): value is any[] => {
  return Array.isArray(value);
};
