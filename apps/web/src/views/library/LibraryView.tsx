import { Link } from "react-router";
import { BookOpen, Compass, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import styles from "./library.module.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { VocabularyCollection } from "../../components/lexicon/vocabulary-collection";

export function LibraryView() {
  return (
    <div className={`latveria-view-container motion-page-enter ${styles.container}`}>
      <PageHeading
        title="Library"
        description="Materi pendamping dan kosakata LBE yang kamu simpan."
      />
      <Tabs defaultValue="materi">
        <TabsList aria-label="Isi Library">
          <TabsTrigger value="materi">Materi</TabsTrigger>
          <TabsTrigger value="vocabulary">Kosakata LBE</TabsTrigger>
        </TabsList>
        <TabsContent value="vocabulary">
          <VocabularyCollection />
        </TabsContent>
        <TabsContent value="materi">
          <Panel className={styles.empty}>
            <div className={styles.icon}>
              <BookOpen size={30} aria-hidden="true" />
            </div>
            <h2>Materi belum tersedia</h2>
            <p>
              Library akan menjadi tempat membaca ringkasan konsep, rumus, dan contoh sebelum kamu
              masuk ke soal. Untuk sekarang, paket soal ada di Drilling dan tryout ada di Battle
              World.
            </p>
            <div className={styles.actions}>
              <Button asChild>
                <Link to="/dashboard?tab=practice">
                  <Compass />
                  Buka Drilling
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard?tab=tryout">
                  <Sparkles />
                  Buka Battle World
                </Link>
              </Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
