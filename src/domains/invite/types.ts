export interface AdminInviteParams {
    pemail: string;
    pfullname: string;
    pphone: string;
    prole: string;
    pschoolkey: string; // UUID
}

export interface SchoolOption {
    key: string;
    name: string;
}
