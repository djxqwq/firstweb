"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { FOOTER_DATA } from "@/constants";
import { fetchVisitStats } from "@/lib/api";

export const Footer = () => {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    fetchVisitStats().then((data) => {
      if (data && typeof data.total === "number") setVisits(data.total);
    });
  }, []);

  return (
    <div className="w-full h-full bg-transparent text-gray-200 shadow-lg p-[15px]">
      <div className="w-full flex flex-col items-center justify-center m-auto">
        <div className="w-full h-full flex flex-row items-center justify-around flex-wrap">
          {FOOTER_DATA.map((column) => (
            <div
              key={column.title}
              className="min-w-[200px] h-auto flex flex-col items-center justify-start"
            >
              <h3 className="font-bold text-[16px]">{column.title}</h3>
              {column.data.map(({ icon: Icon, name, link }) => (
                <Link
                  key={`${column.title}-${name}`}
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex flex-row items-center my-[15px]"
                >
                  {Icon && <Icon />}
                  <span className="text-[15px] ml-[6px]">{name}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="mb-[20px] text-[15px] text-center space-y-2">
          {visits !== null && (
            <motion.div
              whileHover={{ scale: 1.05, color: "#67e8f9" }}
              className="tracking-wide text-cyan-300/90"
            >
              本站累计访问 · {visits.toLocaleString()}
            </motion.div>
          )}
          <div>
            &copy; 邓锦鑫 {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
};
