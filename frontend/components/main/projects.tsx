"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "@/components/sub/project-card";
import {
  ProjectDetailModal,
  type ProjectItem,
} from "@/components/sub/project-detail-modal";
import { PROJECTS } from "@/constants";
import { fetchProjects, resolveMediaUrl, type ApiProject } from "@/lib/api";

const fallback: ProjectItem[] = PROJECTS.map((p) => ({
  title: p.title,
  description: p.description,
  detail: p.detail,
  image: p.image,
  tags: [...(p.tags || [])],
  links: { ...(p.links || {}) },
}));

export const Projects = () => {
  const [items, setItems] = useState<ProjectItem[]>(fallback);
  const [active, setActive] = useState<ProjectItem | null>(null);

  useEffect(() => {
    fetchProjects().then((data) => {
      if (!data?.length) return;
      setItems(
        data.map((p: ApiProject, i) => {
          const body =
            p.body && typeof p.body === "object"
              ? (p.body as Record<string, unknown>)
              : {};
          const detail =
            (typeof body.detail === "string" && body.detail) ||
            p.summary ||
            "";
          return {
            title: p.title,
            description: p.summary || "",
            detail,
            image: p.cover_url
              ? resolveMediaUrl(p.cover_url)
              : `/projects/project-${(i % 3) + 1}.png`,
            tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
            links: {
              github: p.links?.github || undefined,
              demo: p.links?.demo || undefined,
              docs: p.links?.docs || undefined,
            },
          };
        })
      );
    });
  }, []);

  return (
    <section
      id="projects"
      className="relative flex flex-col items-center justify-center py-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(112,66,248,0.12),transparent_60%)]" />
      <h1 className="z-[1] bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text py-16 text-[40px] font-semibold text-transparent">
        项目作品集
      </h1>
      <div className="z-[1] grid w-full max-w-6xl grid-cols-1 gap-8 px-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((project, index) => (
          <ProjectCard
            key={`${project.title}-${index}`}
            src={project.image}
            title={project.title}
            description={project.description}
            tags={project.tags}
            index={index}
            onOpen={() => setActive(project)}
          />
        ))}
      </div>

      <ProjectDetailModal project={active} onClose={() => setActive(null)} />
    </section>
  );
};
