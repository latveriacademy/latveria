import assert from "node:assert/strict";

const exceptions = new Set(["formatting", "mechanical-refactor", "generated-code"]);
const ignored = (path) => path === "bun.lock" || /^apps\/api\/drizzle\/meta\//.test(path);

export function validateCommit(message, changes) {
  const errors = [];
  const subject = message.split("\n")[0];
  if (
    !/^(feat|fix|refactor|style|test|docs|chore|build|ci|perf|revert)(\([a-z0-9][a-z0-9./-]*\))?!?: .+/.test(
      subject,
    ) ||
    subject.length > 100
  ) {
    errors.push("Gunakan Conventional Commit dengan subject maksimal 100 karakter.");
  }
  const exception = message.match(/^Change-Size-Exception: (.+)$/m)?.[1];
  const reason = message.match(/^Exception-Reason: (.+)$/m)?.[1];
  const validException = exceptions.has(exception) && reason?.trim().length >= 30;
  if (exception && !validException)
    errors.push("Pengecualian ukuran membutuhkan tipe yang valid dan alasan minimal 30 karakter.");
  const counted = changes.filter((change) => !ignored(change.path));
  const lines = counted.reduce((sum, change) => sum + change.lines, 0);
  if ((lines > 500 || counted.length > 10) && !validException) {
    errors.push(
      `Diff ${lines} baris/${counted.length} file melebihi batas 500 baris/10 file; pisahkan concern.`,
    );
  }
  return errors;
}

function git(...args) {
  const result = Bun.spawnSync(["git", ...args], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout).trim();
}

function hasPolicy(commit) {
  return (
    Bun.spawnSync(["git", "cat-file", "-e", `${commit}:CONTRIBUTING.md`], {
      stdout: "ignore",
      stderr: "ignore",
    }).exitCode === 0
  );
}

function selfTest() {
  const small = [{ path: "apps/web/src/example.tsx", lines: 40 }];
  assert.deepEqual(validateCommit("fix(web): preserve answers on retry", small), []);
  assert.ok(validateCommit("update everything", small).length);
  assert.ok(validateCommit("feat(web): add catalog", [{ path: "example.ts", lines: 501 }]).length);
  assert.ok(
    validateCommit(
      "feat(web): add catalog",
      Array.from({ length: 11 }, (_, index) => ({ path: `file-${index}.ts`, lines: 1 })),
    ).length,
  );
  assert.deepEqual(
    validateCommit("build: update dependencies", [...small, { path: "bun.lock", lines: 2000 }]),
    [],
  );
  assert.deepEqual(
    validateCommit(
      "style: format workspace\n\nChange-Size-Exception: formatting\nException-Reason: Apply the shared formatter without changing application behavior.",
      [{ path: "example.ts", lines: 2000 }],
    ),
    [],
  );
  assert.ok(
    validateCommit(
      "refactor: split modules\n\nChange-Size-Exception: mechanical-refactor\nException-Reason: too big",
      [{ path: "example.ts", lines: 2000 }],
    ).length,
  );
  console.info("Commit policy self-check PASSED.");
}

if (import.meta.main) {
  if (process.argv[2] === "--self-test") selfTest();
  else {
    const head = process.env.COMMIT_HEAD || "HEAD";
    const base = process.env.COMMIT_BASE;
    const range = process.argv[2] || (base && !/^0+$/.test(base) ? `${base}..${head}` : null);
    const commits = git(
      "rev-list",
      "--reverse",
      "--no-merges",
      ...(range ? [range] : ["--max-count=1", head]),
    )
      .split("\n")
      .filter(Boolean);
    let checked = 0;
    for (const commit of commits) {
      if (!hasPolicy(commit)) {
        if (hasPolicy(`${commit}^`))
          throw new Error("Menghapus CONTRIBUTING.md tidak menonaktifkan aturan commit.");
        continue;
      }
      const changes = git(
        "diff-tree",
        "--root",
        "--no-commit-id",
        "--numstat",
        "--no-renames",
        "-r",
        commit,
      )
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [added, removed, path] = line.split("\t");
          return { path, lines: added === "-" ? 0 : Number(added) + Number(removed) };
        });
      const errors = validateCommit(git("show", "-s", "--format=%B", commit), changes);
      if (errors.length) throw new Error(`${commit.slice(0, 8)}: ${errors.join(" ")}`);
      checked++;
    }
    console.info(
      `Commit policy: ${checked} commit diperiksa; ${commits.length - checked} commit sebelum adopsi dilewati.`,
    );
  }
}
