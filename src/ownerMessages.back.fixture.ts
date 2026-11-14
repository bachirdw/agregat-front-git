// review-orienter-14-11 : réponses et événements produits par le back réel (agregat-back-orienter,
// faux agent ACP, 14/11/2026), recopiés tels quels : le front est essayé sur ce que le back émet.
// Scénarios : steering (remis pendant le tour, 202 « delivered »), mission privée remise en fin de
// tour (événements sans texte ; 400, 404 et 409 du back), message joint à la réponse, non remis.
export const backOwnerMessages = {
  steering: {
    responses: [
      {
        path: "/api/runs/:id/message",
        status: 202,
        body: {
          id: "3071fbd8-bb30-4a67-8a90-4cc600b1542b",
          state: "delivered",
        },
      },
      {
        path: "/api/runs/:id/message",
        status: 409,
        body: {
          error: "Mission terminée : elle ne reçoit plus de message",
        },
      },
    ],
    events: [
      {
        seq: 5,
        type: "owner_message",
        data: {
          id: "3071fbd8-bb30-4a67-8a90-4cc600b1542b",
          at: "2026-11-14T09:46:42.967Z",
          state: "pending",
          via: null,
          deliveredAt: null,
          text: "Concentre-toi sur la ville FICTIVE.",
        },
        at: "2026-11-14T09:46:42.967Z",
      },
      {
        seq: 6,
        type: "owner_message",
        data: {
          id: "3071fbd8-bb30-4a67-8a90-4cc600b1542b",
          at: "2026-11-14T09:46:42.967Z",
          state: "delivered",
          via: "steering",
          deliveredAt: "2026-11-14T09:46:42.973Z",
          text: "Concentre-toi sur la ville FICTIVE.",
        },
        at: "2026-11-14T09:46:42.973Z",
      },
    ],
    bilanLines: [
      "Message du propriétaire reçu à 20:46, remis à 20:46 (pendant le tour).",
    ],
  },
  turn_end_private: {
    responses: [
      {
        path: "/api/runs/:id/message",
        status: 400,
        body: {
          error: "Message vide",
        },
      },
      {
        path: "/api/runs/:id/message",
        status: 400,
        body: {
          error: "Message trop long (8000 caractères au plus)",
        },
      },
      {
        path: "/api/runs/:inconnue/message",
        status: 404,
        body: {
          error: "Run introuvable",
        },
      },
      {
        path: "/api/runs/:id/message",
        status: 202,
        body: {
          id: "45d83a62-1f85-4daf-b952-69ca9a8ef280",
          state: "pending",
        },
      },
      {
        path: "/api/runs/:id/message",
        status: 409,
        body: {
          error: "Mission terminée : elle ne reçoit plus de message",
        },
      },
    ],
    events: [
      {
        seq: 5,
        type: "owner_message",
        data: {
          id: "45d83a62-1f85-4daf-b952-69ca9a8ef280",
          at: "2026-11-14T09:46:43.367Z",
          state: "pending",
          via: null,
          deliveredAt: null,
        },
        at: "2026-11-14T09:46:43.368Z",
      },
      {
        seq: 7,
        type: "owner_message",
        data: {
          id: "45d83a62-1f85-4daf-b952-69ca9a8ef280",
          at: "2026-11-14T09:46:43.367Z",
          state: "delivered",
          via: "turn_end",
          deliveredAt: "2026-11-14T09:46:43.404Z",
        },
        at: "2026-11-14T09:46:43.404Z",
      },
    ],
    bilanLines: [
      "Message du propriétaire reçu à 20:46, remis à 20:46 (en fin de tour).",
    ],
  },
  with_answer: {
    responses: [
      {
        path: "/api/runs/:id/message",
        status: 202,
        body: {
          id: "13e75728-8c26-4c53-8805-59df000e3146",
          state: "pending",
        },
      },
      {
        path: "/api/runs/:id/answer",
        status: 200,
        body: {
          ok: true,
        },
      },
      {
        path: "/api/runs/:id/message",
        status: 409,
        body: {
          error: "Mission terminée : elle ne reçoit plus de message",
        },
      },
    ],
    events: [
      {
        seq: 7,
        type: "owner_message",
        data: {
          id: "13e75728-8c26-4c53-8805-59df000e3146",
          at: "2026-11-14T09:46:43.734Z",
          state: "pending",
          via: null,
          deliveredAt: null,
          text: "Plutôt demain FICTIF.",
        },
        at: "2026-11-14T09:46:43.734Z",
      },
      {
        seq: 10,
        type: "owner_message",
        data: {
          id: "13e75728-8c26-4c53-8805-59df000e3146",
          at: "2026-11-14T09:46:43.734Z",
          state: "delivered",
          via: "with_answer",
          deliveredAt: "2026-11-14T09:46:43.737Z",
          text: "Plutôt demain FICTIF.",
        },
        at: "2026-11-14T09:46:43.737Z",
      },
    ],
    bilanLines: [
      "Message du propriétaire reçu à 20:46, remis à 20:46 (avec la réponse).",
    ],
  },
  undelivered: {
    responses: [
      {
        path: "/api/runs/:id/message",
        status: 202,
        body: {
          id: "8722f220-522f-46f3-a058-848576ae7c70",
          state: "pending",
        },
      },
      {
        path: "/api/runs/:id/message",
        status: 409,
        body: {
          error: "Mission terminée : elle ne reçoit plus de message",
        },
      },
    ],
    events: [
      {
        seq: 5,
        type: "owner_message",
        data: {
          id: "8722f220-522f-46f3-a058-848576ae7c70",
          at: "2026-11-14T09:46:43.907Z",
          state: "pending",
          via: null,
          deliveredAt: null,
          text: "Jamais remis FICTIF.",
        },
        at: "2026-11-14T09:46:43.907Z",
      },
      {
        seq: 6,
        type: "owner_message",
        data: {
          id: "8722f220-522f-46f3-a058-848576ae7c70",
          at: "2026-11-14T09:46:43.907Z",
          state: "undelivered",
          via: null,
          deliveredAt: null,
          text: "Jamais remis FICTIF.",
        },
        at: "2026-11-14T09:46:43.908Z",
      },
    ],
    bilanLines: ["Message du propriétaire reçu à 20:46, non remis."],
  },
} as const;
