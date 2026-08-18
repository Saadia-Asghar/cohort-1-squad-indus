import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  ChevronRight,
  PackagePlus,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { useBuyerSession } from "@/hooks/use-session";
import {
  bakeryQuestStorageKey,
  consumeBakeryQuestStartFlag,
} from "@/lib/bakery-quest";

const PRODUCT_CREATED_EVENT =
  "sweet-tooth:quest-product-created";

type StoredQuest = {
  active: boolean;
  completed: number;
  dismissed: boolean;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const defaultQuest: StoredQuest = {
  active: false,
  completed: 0,
  dismissed: false,
};

function readQuest(bakerId: number): StoredQuest {
  try {
    const raw =
      window.localStorage.getItem(
        bakeryQuestStorageKey(bakerId),
      );

    if (!raw) {
      return defaultQuest;
    }

    const parsed =
      JSON.parse(raw) as Partial<StoredQuest>;

    return {
      active:
        parsed.active === true,
      completed:
        parsed.completed === 1 ? 1 : 0,
      dismissed:
        parsed.dismissed === true,
    };
  } catch {
    return defaultQuest;
  }
}

function writeQuest(
  bakerId: number,
  quest: StoredQuest,
) {
  window.localStorage.setItem(
    bakeryQuestStorageKey(bakerId),
    JSON.stringify(quest),
  );
}

function findTarget(
  selector: string,
): TargetRect | null {
  const element =
    document.querySelector<HTMLElement>(
      selector,
    );

  if (!element) {
    return null;
  }

  const style =
    window.getComputedStyle(element);

  const rect =
    element.getBoundingClientRect();

  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    rect.width < 1 ||
    rect.height < 1
  ) {
    return null;
  }

  const padding = 8;

  return {
    top: Math.max(
      8,
      rect.top - padding,
    ),
    left: Math.max(
      8,
      rect.left - padding,
    ),
    width:
      rect.width + padding * 2,
    height:
      rect.height + padding * 2,
  };
}

export function BakeryQuest() {
  const { bakerId } = useBuyerSession();
  const [location, navigate] =
    useLocation();

  const [hydrated, setHydrated] =
    useState(false);

  const [active, setActive] =
    useState(false);

  const [completed, setCompleted] =
    useState(0);

  const [dismissed, setDismissed] =
    useState(false);

  const [rewardOpen, setRewardOpen] =
    useState(false);

  const [target, setTarget] =
    useState<TargetRect | null>(null);

  const [formOpen, setFormOpen] =
    useState(false);

  const xp = completed * 25;
  const onCatalog =
    location === "/dashboard/catalog";

  useEffect(() => {
    if (!bakerId) {
      return;
    }

    const stored = readQuest(bakerId);
    const startForSignup = consumeBakeryQuestStartFlag();

    if (startForSignup && stored.completed !== 1 && !stored.dismissed) {
      const nextQuest: StoredQuest = {
        active: true,
        completed: 0,
        dismissed: false,
      };
      writeQuest(bakerId, nextQuest);
      setActive(true);
      setCompleted(0);
      setDismissed(false);
    } else {
      setActive(stored.active);
      setCompleted(stored.completed);
      setDismissed(stored.dismissed);
    }

    setHydrated(true);
  }, [bakerId]);

  useEffect(() => {
    const handleProductCreated = () => {
      if (
        !active ||
        completed > 0
      ) {
        return;
      }

      const nextQuest: StoredQuest = {
        active: false,
        completed: 1,
        dismissed: false,
      };

      setActive(false);
      setCompleted(1);
      setTarget(null);
      setRewardOpen(true);
      if (bakerId) {
        writeQuest(bakerId, nextQuest);
      }

      window.setTimeout(() => {
        setRewardOpen(false);
      }, 2400);
    };

    window.addEventListener(
      PRODUCT_CREATED_EVENT,
      handleProductCreated,
    );

    return () => {
      window.removeEventListener(
        PRODUCT_CREATED_EVENT,
        handleProductCreated,
      );
    };
  }, [
    active,
    bakerId,
    completed,
  ]);

  useEffect(() => {
    if (
      !active ||
      !onCatalog ||
      completed > 0
    ) {
      setTarget(null);
      setFormOpen(false);
      return;
    }

    const updateTarget = () => {
      const productFormOpen = Boolean(
        document.querySelector(
          '[data-quest="product-form"]',
        ),
      );

      setFormOpen(productFormOpen);

      setTarget(
        findTarget(
          productFormOpen
            ? '[data-quest="save-product"]'
            : '[data-quest="add-product"]',
        ),
      );
    };

    const firstTimer =
      window.setTimeout(
        updateTarget,
        120,
      );

    const secondTimer =
      window.setTimeout(
        updateTarget,
        500,
      );

    const handleDocumentClick = () => {
      window.setTimeout(
        updateTarget,
        80,
      );
    };

    window.addEventListener(
      "resize",
      updateTarget,
    );

    window.addEventListener(
      "scroll",
      updateTarget,
      true,
    );

    document.addEventListener(
      "click",
      handleDocumentClick,
      true,
    );

    return () => {
      window.clearTimeout(
        firstTimer,
      );

      window.clearTimeout(
        secondTimer,
      );

      window.removeEventListener(
        "resize",
        updateTarget,
      );

      window.removeEventListener(
        "scroll",
        updateTarget,
        true,
      );

      document.removeEventListener(
        "click",
        handleDocumentClick,
        true,
      );
    };
  }, [
    active,
    completed,
    location,
    onCatalog,
  ]);

  const startQuest = () => {
    const nextQuest: StoredQuest = {
      active: true,
      completed: 0,
      dismissed: false,
    };

    setActive(true);
    setCompleted(0);
    setDismissed(false);
    if (bakerId) {
      writeQuest(bakerId, nextQuest);
    }

    if (!onCatalog) {
      navigate(
        "/dashboard/catalog",
      );
      return;
    }

    window.setTimeout(() => {
      const element =
        document.querySelector<HTMLElement>(
          '[data-quest="add-product"]',
        );

      element?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  const dismissQuest = () => {
    const nextQuest: StoredQuest = {
      active: false,
      completed,
      dismissed: true,
    };

    setActive(false);
    setDismissed(true);
    setTarget(null);
    if (bakerId) {
      writeQuest(bakerId, nextQuest);
    }
  };

  if (
    !hydrated ||
    dismissed
  ) {
    return null;
  }

  const highlightStyle:
    CSSProperties | undefined = target
    ? {
        top: target.top,
        left: target.left,
        width: target.width,
        height: target.height,
        boxShadow: formOpen
          ? "0 0 0 4px rgba(243,199,109,0.42), 0 0 34px rgba(243,199,109,0.68)"
          : "0 0 0 9999px rgba(27, 12, 32, 0.64)",
      }
    : undefined;

  return (
    <>
      {active &&
      onCatalog &&
      target ? (
        <div
          className="pointer-events-none fixed z-[70] rounded-2xl border-2 border-[#f3c76d] shadow-[0_0_34px_rgba(243,199,109,0.58)]"
          style={highlightStyle}
          aria-hidden="true"
        >
          <span className="absolute -inset-2 animate-pulse rounded-[1.25rem] border-2 border-[#f3c76d]/70" />
        </div>
      ) : null}

      <aside
        className="fixed bottom-[5.7rem] right-3 z-[80] w-[calc(100%-1.5rem)] max-w-[22rem] overflow-hidden rounded-2xl border border-[#d7b56c]/45 bg-[#fffaf5] text-foreground shadow-[0_24px_70px_rgba(29,13,34,0.28)] xl:bottom-6 xl:right-6"
        aria-live="polite"
      >
        <div className="bg-gradient-to-r from-[#32173b] via-[#4a2053] to-[#632a73] px-4 py-3.5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#f3c76d]/40 bg-[#f3c76d]/10 text-[#f3c76d]">
                {completed > 0 ? (
                  <Trophy className="h-5 w-5" />
                ) : (
                  <PackagePlus className="h-5 w-5" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#f3c76d]">
                  Bakery setup quest
                </p>

                <p className="mt-0.5 truncate text-sm font-semibold">
                  Level 1
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissQuest}
              aria-label="Skip bakery setup quest"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em]">
            <span className="text-muted-foreground">
              Experience
            </span>

            <span className="text-secondary">
              {xp} / 100 XP
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eadfd5]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c24f7a] to-[#e0ad56] transition-all duration-700"
              style={{
                width: `${xp}%`,
              }}
            />
          </div>

          {completed > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#168a55]">
                Mission complete
              </p>

              <h2 className="mt-1 font-serif text-xl font-semibold tracking-[-0.02em]">
                Display stocked
              </h2>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Your first product is ready. You earned 25 XP.
              </p>

              <button
                type="button"
                onClick={dismissQuest}
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border bg-white px-4 text-xs font-semibold text-primary"
              >
                Close quest log
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">
                Current objective
              </p>

              <h2 className="mt-1 font-serif text-xl font-semibold tracking-[-0.02em]">
                Stock the display
              </h2>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Create one real menu product to earn your first 25 XP.
              </p>

              {active && onCatalog ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#ead7a9] bg-[#fff4d8] px-3 py-2.5 text-xs font-semibold leading-5 text-[#76551f]">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 animate-pulse" />

                  <span>
                    {formOpen
                      ? "Complete the required fields, then press the glowing Save product button."
                      : "Press the glowing Add product button."}
                  </span>
                </div>
              ) : null}

              {!active || !onCatalog ? (
                <button
                  type="button"
                  onClick={startQuest}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white transition hover:bg-[#542261]"
                >
                  {active
                    ? "Continue quest"
                    : "Start quest"}

                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={dismissQuest}
                className="mt-2 w-full py-1.5 text-[11px] font-semibold text-[#8b7d89] transition hover:text-foreground"
              >
                Skip tutorial
              </button>
            </div>
          )}
        </div>
      </aside>

      {rewardOpen ? (
        <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-[#1d0d22]/35 px-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-xs overflow-hidden rounded-3xl border border-[#f3c76d]/60 bg-[#fffaf5] p-7 text-center shadow-[0_30px_90px_rgba(23,10,28,0.48)]">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <span
                key={index}
                className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-[#e0ad56]"
                style={{
                  left: `${12 + index * 11}%`,
                  top:
                    index % 2 === 0
                      ? "18%"
                      : "72%",
                  animationDelay:
                    `${index * 90}ms`,
                }}
              />
            ))}

            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f6e6b9] text-[#9b6a19]">
              <Trophy className="h-8 w-8 animate-bounce" />
            </span>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
              Mission complete
            </p>

            <h2 className="mt-2 font-serif text-3xl font-semibold">
              +25 XP
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Your first product has joined the display.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}