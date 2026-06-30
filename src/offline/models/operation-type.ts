export const OPERATION_TYPES = ['CREATE', 'UPDATE', 'DELETE'] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];
