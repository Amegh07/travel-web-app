"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
    title: string;
    icon: LucideIcon;
    type?: never;
}

interface Separator {
    type: "separator";
    title?: never;
    icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
    tabs: TabItem[];
    className?: string;
    activeColor?: string;
    onChange?: (index: number | null) => void;
}

const buttonVariants = {
    initial: {
        gap: 0,
        paddingLeft: ".75rem",
        paddingRight: ".75rem",
    },
    animate: (isSelected: boolean) => ({
        gap: isSelected ? ".75rem" : 0,
        paddingLeft: isSelected ? "1.5rem" : ".75rem",
        paddingRight: isSelected ? "1.5rem" : ".75rem",
    }),
};

const spanVariants = {
    initial: { width: 0, opacity: 0 },
    animate: { width: "auto", opacity: 1 },
    exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring", bounce: 0, duration: 1.2 };

export function ExpandableTabs({
    tabs,
    className,
    activeColor = "text-primary",
    onChange,
}: ExpandableTabsProps) {
    const [selected, setSelected] = React.useState<number | null>(null);
    const outsideClickRef = React.useRef(null);

    useOnClickOutside(outsideClickRef, () => {
        setSelected(null);
        onChange?.(null);
    });

    const handleSelect = (index: number) => {
        setSelected(index);
        onChange?.(index);
    };

    const Separator = () => (
        <div className="mx-2 h-[24px] w-[1px] bg-border" aria-hidden="true" />
    );

    return (
        <div
            ref={outsideClickRef}
            className={cn(
                "flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-panel p-2 shadow-[0_1px_4px_rgba(28,25,22,0.05)]",
                className
            )}
        >
            {tabs.map((tab, index) => {
                if (tab.type === "separator") {
                    return <Separator key={`separator-${index}`} />;
                }

                const Icon = tab.icon;
                return (
                    <motion.button
                        key={tab.title}
                        variants={buttonVariants}
                        initial={false}
                        animate="animate"
                        custom={selected === index}
                        onClick={() => handleSelect(index)}
                        transition={transition}
                        className={cn(
                            "relative flex items-center rounded-xl py-3 text-[10px] uppercase tracking-widest font-medium transition-colors duration-700",
                            selected === index
                                ? cn("bg-background", activeColor)
                                : "text-muted hover:bg-background/50 hover:text-primary"
                        )}
                    >
                        <Icon size={16} strokeWidth={1.5} />
                        <AnimatePresence initial={false}>
                            {selected === index && (
                                <motion.span
                                    variants={spanVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={transition}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    {tab.title}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                );
            })}
        </div>
    );
}
