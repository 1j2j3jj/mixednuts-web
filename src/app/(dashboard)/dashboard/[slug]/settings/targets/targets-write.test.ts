import { describe, expect, it } from "vitest";
import {
  buildTargetPreviewMessage,
  buildTargetsMergeQuery,
  classifyTargetChanges,
} from "./targets-write";

const existing = [
  {
    metric: "受注金額",
    channel: "全体",
    year_month: "2026-06-01",
    value: 100,
  },
  {
    metric: "受注金額",
    channel: "全体",
    year_month: "2026-07-01",
    value: 200,
  },
  {
    metric: "受注件数",
    channel: "広告",
    year_month: "2026-07-01",
    value: 3,
  },
];

describe("classifyTargetChanges", () => {
  it("preserves existing rows omitted from a smaller upload", () => {
    const stats = classifyTargetChanges(
      [
        {
          metric: "受注金額",
          channel: "全体",
          year_month: "2026-07-01",
          value: 250,
        },
      ],
      existing,
    );
    expect(stats).toMatchObject({
      updatedCount: 1,
      preservedCount: 2,
      explicitDeleteCount: 0,
      untouchedCount: 2,
    });
    expect(buildTargetPreviewMessage(stats)).toContain("未指定で温存 2件");
  });

  it("deletes exactly the matching explicit-delete key", () => {
    expect(
      classifyTargetChanges(
        [
          {
            metric: "受注件数",
            channel: "広告",
            year_month: "2026-07-01",
            value: null,
          },
        ],
        existing,
      ),
    ).toMatchObject({
      explicitDeleteCount: 1,
      deleteNoopCount: 0,
      preservedCount: 2,
      untouchedCount: 2,
    });
  });

  it("ignores non-目標 rows so the preview matches what the MERGE touches", () => {
    // 同じキーに '実績' 行が同居しても、目標アップロードの差分対象にしない。
    // 絞らないと「更新 1件」と予告して実際は実績行を書き換える不一致になる。
    const withActual = [
      ...existing,
      {
        metric: "受注金額",
        channel: "全体",
        year_month: "2026-08-01",
        value: 999,
        kind: "実績",
      },
    ];
    expect(
      classifyTargetChanges(
        [
          {
            metric: "受注金額",
            channel: "全体",
            year_month: "2026-08-01",
            value: 500,
          },
        ],
        withActual,
      ),
    ).toMatchObject({
      newCount: 1,
      updatedCount: 0,
      existingCount: 3,
    });
  });

  it("separates changed values from same-value uploads", () => {
    expect(
      classifyTargetChanges(
        [
          { ...existing[0], value: 100 },
          { ...existing[1], value: 250 },
        ],
        existing,
      ),
    ).toMatchObject({
      updatedCount: 1,
      sameValueCount: 1,
      preservedCount: 1,
      untouchedCount: 2,
    });
  });
});

describe("buildTargetsMergeQuery", () => {
  it("uses one four-column-key MERGE without deleting omitted rows", () => {
    const query = buildTargetsMergeQuery(
      [
        {
          metric: "受注金額",
          channel: "全体",
          year_month: "2026-07-01",
          value: 250,
        },
      ],
      "hs",
      "editor@example.com",
    );
    expect(query).not.toBeNull();
    expect(query?.sql).toContain(
      "MERGE `ai-agent-mixednuts.app_analytics.targets_long`",
    );
    expect(query?.sql).toContain("T.client_id = S.client_id");
    expect(query?.sql).toContain("T.metric = S.metric");
    expect(query?.sql).toContain("T.channel = S.channel");
    expect(query?.sql).toContain("T.year_month = S.year_month");
    expect(query?.sql).not.toContain("NOT MATCHED BY SOURCE");
    expect(query?.sql).not.toMatch(/DELETE FROM/i);
    expect(query?.params.cid).toBe("hs");
  });

  it("scopes matching to 目標 rows like the read path does", () => {
    // sources/target.ts が `kind = '目標' OR kind IS NULL` で読むため、書き込みも
    // 同じ範囲に閉じる。欠けると将来 '実績' 行を UPDATE/DELETE してしまう。
    const query = buildTargetsMergeQuery(
      [
        {
          metric: "受注金額",
          channel: "全体",
          year_month: "2026-07-01",
          value: 250,
        },
      ],
      "hs",
      "editor@example.com",
    );
    expect(query?.sql).toContain("T.kind = '目標' OR T.kind IS NULL");
  });

  it("handles delete markers and skips unchanged update churn", () => {
    const query = buildTargetsMergeQuery(
      [
        {
          metric: "受注件数",
          channel: "広告",
          year_month: "2026-07-01",
          value: null,
        },
      ],
      "hs",
      "editor@example.com",
    );
    expect(query?.sql).toContain("WHEN MATCHED AND S.is_delete THEN DELETE");
    expect(query?.sql).toContain("WHEN NOT MATCHED AND NOT S.is_delete");
    expect(query?.sql).toContain("T.value IS DISTINCT FROM S.value");
    expect(query?.params.del0).toBe(true);
    expect(query?.params.v0).toBeNull();
    expect(query?.types.del0).toBe("BOOL");
  });
});
