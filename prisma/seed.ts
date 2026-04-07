import { hashSync } from "bcryptjs";

function main() {
  const demoUser = {
    email: "owner@clearmatch.app",
    passwordHash: hashSync("DemoFinance123!", 10),
  };

  console.log("Seed templates prepared for:");
  console.log(JSON.stringify(demoUser, null, 2));
}

main();
