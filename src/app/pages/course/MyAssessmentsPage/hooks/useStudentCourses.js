import { useEffect, useState } from "react";
import * as studentService from "$api/services/courses/students";
import { database } from "$api/config/firebase";
import { ref, get } from "firebase/database";

const getCourseId = (c) =>
  c?.courseId ?? c?.id ?? c?.course?.id ?? c?.course?.courseId;

/**
 * Cursos em que o aluno está matriculado, com o título hidratado direto do
 * Firebase quando falta no próprio registro de matrícula, e o nome de
 * exibição do aluno (com fallback ao banco quando o Auth não o traz).
 */
export function useStudentCourses({ userId, userDetails }) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [courseMetaMap, setCourseMetaMap] = useState({});
  const [userFallbackName, setUserFallbackName] = useState("");

  const getCourseTitle = (c) =>
    c?.title ||
    c?.name ||
    c?.courseTitle ||
    c?.course?.title ||
    c?.course?.name ||
    c?.courseInfo?.title ||
    c?.courseInfo?.name ||
    (courseMetaMap[getCourseId(c)]?.title ?? `Curso ${getCourseId(c)}`);

  useEffect(() => {
    if (!userId) return;

    const loadStudentCourses = async () => {
      try {
        setLoading(true);
        const studentCourses = await studentService.fetchStudentCourses(userId);
        const list = (studentCourses || []).map((c) => ({
          ...c,
          id: getCourseId(c),
        }));
        list.sort((a, b) => getCourseTitle(a).localeCompare(getCourseTitle(b)));
        setCourses(list);
      } catch (err) {
        console.error("Erro ao carregar cursos do estudante:", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudentCourses();
  }, [userId]);

  // Fallback: obter nome do usuário no DB se não vier do Auth
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const snap = await get(ref(database, `users/${userId}`));
        if (snap.exists()) {
          const u = snap.val();
          const display =
            u?.displayName ||
            u?.name ||
            (u?.firstName && `${u.firstName} ${u.lastName || ""}`) ||
            "";
          setUserFallbackName((display || u?.email || "").trim());
        }
      } catch (e) {
        // silencioso
      }
    })();
  }, [userId]);

  // Hidratar metadados de cursos faltantes (apenas title) diretamente do Firebase
  useEffect(() => {
    const missing = (courses || []).filter((c) => !c.title && !c.name);
    if (missing.length === 0) return;
    (async () => {
      try {
        const updates = await Promise.all(
          missing.map(async (c) => {
            const id = getCourseId(c);
            if (!id) return null;
            try {
              const snap = await get(ref(database, `courses/${id}`));
              if (snap.exists()) {
                const raw = snap.val();
                const title =
                  raw?.title ||
                  raw?.name ||
                  raw?.courseTitle ||
                  raw?.course?.title ||
                  raw?.course?.name ||
                  raw?.courseInfo?.title ||
                  raw?.courseInfo?.name ||
                  `Curso ${id}`;
                return { id, title };
              }
            } catch (e) {
              // ignora falha isolada
            }
            return { id, title: `Curso ${id}` };
          })
        );
        const map = {};
        updates.filter(Boolean).forEach((m) => {
          map[m.id] = { title: m.title };
        });
        if (Object.keys(map).length) {
          setCourseMetaMap((prev) => ({ ...prev, ...map }));
          setCourses((prev) =>
            prev.map((c) => {
              const id = getCourseId(c);
              const meta = map[id];
              return meta ? { ...c, title: c.title || meta.title } : c;
            })
          );
        }
      } catch {
        // Carga acessória: falhar aqui não impede a tela de renderizar.
      }
    })();
  }, [courses]);

  const userName =
    userDetails?.name ||
    userDetails?.displayName ||
    userDetails?.user?.displayName ||
    userDetails?.profile?.name ||
    userDetails?.email ||
    userDetails?.user?.email ||
    userFallbackName ||
    "";

  return { courses, loading, userName, getCourseId, getCourseTitle };
}
