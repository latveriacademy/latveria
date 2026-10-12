import { Link } from "react-router";
import type { Topic } from "@latveria/shared";
import { SubtestIcon } from "../../components/subtest-icon";
import styles from "./dashboard.module.css";

export function TopicList({ items }: { items: Topic[] }) {
  if (!items.length)
    return (
      <div className={styles.empty}>
        <p>Belum ada topik latihan.</p>
      </div>
    );
  return (
    <div className={styles.topicGroups}>
      {(["tps", "literasi"] as const).map((section) => {
        const topics = items.filter((topic) => topic.section === section);
        if (!topics.length) return null;
        return (
          <section
            key={section}
            aria-label={section === "tps" ? "Tes Potensi Skolastik" : "Tes Literasi"}
          >
            <h3>{section === "tps" ? "Tes Potensi Skolastik" : "Tes Literasi"}</h3>
            <ul className={styles.topicList}>
              {topics.map((topic) => {
                return (
                  <li key={topic.slug}>
                    {topic.questionCount ? (
                      <Link to={`/dashboard/topik/${topic.slug}`}>
                        <span className={styles.topicMark} aria-hidden="true">
                          <SubtestIcon slug={topic.slug} />
                        </span>
                        <span className={styles.topicName}>{topic.name}</span>
                        <span className={styles.topicCount}>{topic.questionCount} soal contoh</span>
                        <span className={styles.topicArrow} aria-hidden="true">
                          ›
                        </span>
                      </Link>
                    ) : (
                      <div className={styles.topicUnavailable}>
                        <span className={styles.topicMark} aria-hidden="true">
                          <SubtestIcon slug={topic.slug} />
                        </span>
                        <span className={styles.topicName}>{topic.name}</span>
                        <span className={styles.topicCount}>Soal disiapkan</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
