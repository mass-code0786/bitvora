import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.KYC_DATA_DIR=join(tmpdir(),`bitvora-kyc-tests-${process.pid}`);
