import { TableRow } from "@/domains/auth/types";

export interface AdminInviteParams {
    pemail: string;
    pfullname: string;
    pphone: string;
    prole: string;
    pschoolkey: string; // UUID
}

export type SchoolOption = Pick<TableRow<'schools'>, 'key' | 'name'>;
