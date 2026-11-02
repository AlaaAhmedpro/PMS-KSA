import { LS } from "../demo-mode/keys";
import { createLocalJsonRepository } from "./localJsonRepository";
import type { DemoSession, DemoUser, Organization } from "../models/domain";
import { SEED_DEMO_USERS, SEED_ORG } from "../lib/hierarchySeed";
import { migrateOrganizations } from "../lib/orgModules";

export const usersRepository = createLocalJsonRepository<DemoUser[]>(
  LS.users,
  SEED_DEMO_USERS,
);

export const sessionRepository = createLocalJsonRepository<DemoSession | null>(
  LS.session,
  null,
);

const rawOrganizationsRepository = createLocalJsonRepository<Organization[]>(
  LS.organizations,
  [SEED_ORG],
);

export const organizationsRepository = {
  read: (): Organization[] => migrateOrganizations(rawOrganizationsRepository.read()),
  write: (value: Organization[]) =>
    rawOrganizationsRepository.write(migrateOrganizations(value)),
};

export { createLocalJsonRepository } from "./localJsonRepository";
