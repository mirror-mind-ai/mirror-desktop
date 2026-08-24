import type { JourneyRegistry } from "../domain/journeyRegistry";

export const fixtureJourneyRegistry: JourneyRegistry = {
  schemaVersion: "0.1.0",
  source: "fixture",
  syncedAt: "2026-08-22T00:00:00.000Z",
  roots: [
    {
      id: "vida-criativa",
      name: "Vida Criativa",
      description: "Creative work finding form and language",
      status: "active",
      stage: "active",
      children: [
        {
          id: "nautilus",
          name: "Nautilus",
          description: "Agentic realization",
          status: "active",
          stage: "active",
          parentId: "vida-criativa",
          children: [
            {
              id: "nautilus-harness",
              name: "Nautilus Harness",
              description: "Journey cockpit",
              status: "active",
              stage: "Iteration 1",
              parentId: "nautilus",
            },
          ],
        },
        {
          id: "amplia",
          name: "Amplia",
          description: "Learning field",
          status: "active",
          stage: "active",
          parentId: "vida-criativa",
        },
      ],
    },
    {
      id: "lideranca-soberana",
      name: "Liderança Soberana",
      description: "Practice path",
      status: "active",
      stage: "active",
      children: [
        {
          id: "livro-lideranca-soberana",
          name: "Livro Liderança Soberana",
          description: "Editorial journey",
          status: "active",
          stage: "Manuscrito iniciado",
          parentId: "lideranca-soberana",
        },
      ],
    },
    {
      id: "mirror-dev",
      name: "Mirror Dev",
      description: "Runtime craft",
      status: "active",
      stage: "active",
    },
    {
      id: "softwarezen",
      name: "Software Zen",
      description: "Business garden",
      status: "active",
      stage: "active",
    },
    {
      id: "ariad",
      name: "Ariad",
      description: "Builder method",
      status: "active",
      stage: "active",
    },
  ],
};
