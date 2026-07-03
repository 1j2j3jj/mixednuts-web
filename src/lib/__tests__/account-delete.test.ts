import { describe, it, expect } from "vitest";
import { findOrphanedOrgs } from "@/lib/account-delete";

const org = (id: string, slug: string | null, role: string) => ({
  organizationId: id,
  orgSlug: slug,
  role,
});

describe("findOrphanedOrgs（オーナー孤児化ガード）", () => {
  it("owner でないメンバーシップはガード対象外", () => {
    expect(
      findOrphanedOrgs(
        [org("o1", "chakin", "member"), org("o2", "dozo", "editor")],
        []
      )
    ).toEqual([]);
  });

  it("owner で他に owner/admin がいない org を返す", () => {
    expect(
      findOrphanedOrgs(
        [org("o1", "chakin", "owner")],
        [{ organizationId: "o1", role: "member" }]
      )
    ).toEqual(["chakin"]);
  });

  it("editor は管理者に数えない（editor しか残らない org は孤児）", () => {
    expect(
      findOrphanedOrgs(
        [org("o1", "chakin", "owner")],
        [{ organizationId: "o1", role: "editor" }]
      )
    ).toEqual(["chakin"]);
  });

  it("他に owner がいればガードに掛からない", () => {
    expect(
      findOrphanedOrgs(
        [org("o1", "chakin", "owner")],
        [{ organizationId: "o1", role: "owner" }]
      )
    ).toEqual([]);
  });

  it("他に admin がいればガードに掛からない", () => {
    expect(
      findOrphanedOrgs(
        [org("o1", "chakin", "owner")],
        [{ organizationId: "o1", role: "admin" }]
      )
    ).toEqual([]);
  });

  it("別 org の admin は数えない（org 単位で判定）", () => {
    expect(
      findOrphanedOrgs(
        [org("o1", "chakin", "owner")],
        [{ organizationId: "o2", role: "admin" }]
      )
    ).toEqual(["chakin"]);
  });

  it("複数 org: 孤児化する org だけ列挙、slug null は id で代替", () => {
    expect(
      findOrphanedOrgs(
        [org("o1", "chakin", "owner"), org("o2", null, "owner"), org("o3", "hs", "member")],
        [{ organizationId: "o1", role: "admin" }]
      )
    ).toEqual(["o2"]);
  });

  it("メンバーシップ無しなら空", () => {
    expect(findOrphanedOrgs([], [])).toEqual([]);
  });
});

import { findEnvGrants } from "../account-delete";

describe("account-delete.findEnvGrants (env 許可リスト照合)", () => {
  const env = {
    ADMIN_EMAILS: "nozomi@mixednuts-inc.com, ops@mixednuts-inc.com",
    CLIENT_EMAILS_HS: "A-Nakatani@trans.co.jp,h-namiki@trans.co.jp",
    CLIENT_EMAILS_DOZO: "",
    UNRELATED_VAR: "someone@example.com",
  };
  it("CLIENT_EMAILS_* にある email を検出（大小文字無視）", () => {
    expect(findEnvGrants("a-nakatani@trans.co.jp", env)).toEqual([
      "CLIENT_EMAILS_HS",
    ]);
  });
  it("ADMIN_EMAILS も検出", () => {
    expect(findEnvGrants("ops@mixednuts-inc.com", env)).toEqual(["ADMIN_EMAILS"]);
  });
  it("無関係な env キーは対象外", () => {
    expect(findEnvGrants("someone@example.com", env)).toEqual([]);
  });
  it("載っていない email は空配列", () => {
    expect(findEnvGrants("free@example.com", env)).toEqual([]);
  });
  it("空 email は空配列", () => {
    expect(findEnvGrants("", env)).toEqual([]);
  });
});
