import { execFileSync } from "node:child_process";
import { BUILT_CONTAINER } from "./built-env";

// Stopping the docker CLI does not always stop the container it started.
export default function builtTeardown() {
  execFileSync("docker", ["rm", "-f", BUILT_CONTAINER], { stdio: "ignore" });
}
