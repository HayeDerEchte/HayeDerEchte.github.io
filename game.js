// Simple same-device party game: Comment mode

const app = document.getElementById("app");

const Screen = {
  START: "start",
  LOBBY: "lobby",
  PASS_DEVICE: "pass_device",
  PHASE_QUESTION: "phase_question",
  PHASE_ANSWER: "phase_answer",
  PHASE_TWIST: "phase_twist",
  RESULTS: "results",
};

let state = {
  hostName: "",
  players: [], // { id, name }
  hostId: null,
  currentScreen: Screen.START,
  lobbyCode: "LOCAL",
  currentPlayerIndex: 0,
  phase: 1,
  settings: {
    questionsPerPlayer: 1,
  },
  roundData: {
    questions: [], // { playerId, text }
    answers: [], // { playerId, questionOwnerId, text }
    twisted: [], // { playerId, answerOwnerId, text }
    questionOrder: [],
    answerOrder: [],
    questionsCount: {}, // playerId -> count
  },
  resultsIndex: 0,
};

function setState(patch) {
  state = { ...state, ...patch };
  render();
}

function resetRound() {
  state.roundData = {
    questions: [],
    answers: [],
    twisted: [],
    questionOrder: [],
    answerOrder: [],
    questionsCount: {},
  };
  state.currentPlayerIndex = 0;
  state.phase = 1;
  state.resultsIndex = 0;
}

function createId() {
  return Math.random().toString(36).slice(2, 9);
}

function currentPlayer() {
  return state.players[state.currentPlayerIndex] || null;
}

function isHost(player) {
  return player && player.id === state.hostId;
}

function getPlayerName(playerId) {
  const p = state.players.find((pl) => pl.id === playerId);
  return p ? p.name : "???";
}

// ----- UI helpers -----

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2), v);
    } else if (v !== undefined && v !== null) {
      node.setAttribute(k, v);
    }
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined) return;
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  });
  return node;
}

// ----- Screens -----

function renderStart() {
  const nameInputId = "host-name";
  const input = el("input", {
    id: nameInputId,
    class: "input",
    placeholder: "Dein Name (Host)",
    autocomplete: "off",
  });

  const button = el("button", {
    class: "btn-primary",
    onclick: () => {
      const name = input.value.trim();
      if (!name) return;
      const hostId = createId();
      state.hostName = name;
      state.players = [{ id: hostId, name }];
      state.hostId = hostId;
      state.lobbyCode = "LOCAL";
      resetRound();
      setState({ currentScreen: Screen.LOBBY });
    },
  }, ["Lobby erstellen"]);

  return el("div", { class: "card" }, [
    el("div", { class: "header" }, [
      el("div", { class: "title", text: "Party Comment Game" }),
      el("div", { class: "badge" }, [
        el("span", { class: "badge-dot" }),
        "Same Device",
      ]),
    ]),
    el("p", {
      class: "subtitle",
      text: "Alle sitzen am gleichen Handy und reichen es nacheinander weiter.",
    }),
    el("div", { class: "section" }, [
      el("div", { class: "section-label", text: "Host" }),
      input,
      el("p", {
        class: "helper-text",
        text: "Der Host steuert die Runden. Du kannst später Spieler hinzufügen.",
      }),
    ]),
    el("div", { class: "btn-row" }, [button]),
  ]);
}

function renderLobby() {
  const nameInput = el("input", {
    class: "input",
    placeholder: "Spielername hinzufügen",
    autocomplete: "off",
  });

  const addPlayer = () => {
    const name = nameInput.value.trim();
    if (!name) return;
    state.players.push({ id: createId(), name });
    nameInput.value = "";
    render();
  };

  const playersView = el("div", { class: "player-list" }, state.players.map((p) =>
    el("div", { class: "player-pill" + (isHost(p) ? " player-pill-host" : "") }, [
      el("span", { class: "dot" }),
      p.name,
      isHost(p) ? el("span", { class: "chip", text: "Host" }) : null,
    ])
  ));

  const canStart = state.players.length >= 3;

  const qInput = el("input", {
    class: "input",
    type: "number",
    min: "1",
    max: "5",
    value: String(state.settings.questionsPerPlayer || 1),
  });

  qInput.addEventListener("change", () => {
    const raw = parseInt(qInput.value, 10);
    if (!Number.isFinite(raw)) return;
    const clamped = Math.min(5, Math.max(1, raw));
    state.settings.questionsPerPlayer = clamped;
    qInput.value = String(clamped);
  });

  const startButton = el("button", {
    class: "btn-primary",
    onclick: () => {
      if (!canStart) return;
      resetRound();
      setState({ currentScreen: Screen.PASS_DEVICE, phase: 1, currentPlayerIndex: 0 });
    },
    disabled: canStart ? null : true,
  }, [canStart ? "Runde starten" : "Mindestens 3 Spieler"]);

  const resetButton = el("button", {
    class: "btn-danger",
    onclick: () => {
      state.players = state.players.filter((p) => isHost(p));
      resetRound();
      render();
    },
  }, ["Nur Host behalten"]);

  return el("div", { class: "card" }, [
    el("div", { class: "header" }, [
      el("div", { class: "title", text: "Lobby" }),
      el("div", { class: "badge" }, [
        el("span", { class: "badge-dot" }),
        "Code: " + state.lobbyCode,
      ]),
    ]),
    el("p", { class: "subtitle", text: "Alle Spieler sitzen an einem Gerät." }),
    el("div", { class: "section" }, [
      el("div", { class: "section-label", text: "Spieler" }),
      playersView,
    ]),
    el("div", { class: "section" }, [
      el("div", { class: "section-label", text: "Lobby-Einstellungen" }),
      el("p", { class: "helper-text", text: "Wie viele Fragen soll jeder Spieler in Phase 1 schreiben?" }),
      qInput,
    ]),
    el("div", { class: "section" }, [
      el("div", { class: "section-label", text: "Spieler hinzufügen" }),
      nameInput,
      el("div", { class: "helper-text", text: "Name eingeben und Enter tippen oder Button drücken." }),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn-ghost", onclick: addPlayer }, ["Hinzufügen"]),
        resetButton,
      ]),
    ]),
    el("div", { class: "section" }, [
      el("div", { class: "meta-row" }, [
        el("div", { class: "phase-indicator" }, [
          el("span", { class: "phase-dot" }),
          "Modus: Comment",
        ]),
        el("div", { class: "code-pill", text: state.players.length + " Spieler" }),
      ]),
      el("div", { class: "btn-row" }, [startButton]),
    ]),
  ]);
}

function renderPassDevice(nextScreen) {
  const player = currentPlayer();
  if (!player) return renderLobby();

  const title = "Gebe weiter zu";

  const button = el("button", {
    class: "btn-primary",
    onclick: () => {
      setState({ currentScreen: nextScreen });
    },
  }, ["Bereit"]); 

  return el("div", { class: "card pass-device" }, [
    el("div", { class: "pass-device-title", text: title }),
    el("div", { class: "pass-device-name", text: player.name }),
    el("p", {
      class: "helper-text",
      text: "Alle anderen wegschauen. Nur " + player.name + " darf jetzt schauen.",
    }),
    el("div", { class: "btn-row" }, [button]),
  ]);
}

// ----- Phase 1: Fragen schreiben -----

function renderPhaseQuestion() {
  const player = currentPlayer();
  if (!player) return renderLobby();

  const textarea = el("textarea", {
    class: "textarea",
    placeholder: "Schreibe eine fiese / lustige Frage…",
  });

  const next = () => {
    const text = textarea.value.trim();
    if (!text) return;
    state.roundData.questions.push({ playerId: player.id, text });
    const per = state.settings.questionsPerPlayer || 1;
    const counts = state.roundData.questionsCount || {};
    const currentCount = counts[player.id] || 0;
    counts[player.id] = currentCount + 1;
    state.roundData.questionsCount = counts;

    const allDone = state.players.every((p) => (counts[p.id] || 0) >= per);

    if (allDone) {
      state.currentPlayerIndex = 0;
      state.phase = 2;
      setState({ currentScreen: Screen.PASS_DEVICE });
      return;
    }

    const thisDone = counts[player.id] >= per;
    if (thisDone) {
      const isLastPlayer = state.currentPlayerIndex >= state.players.length - 1;
      if (isLastPlayer) {
        state.currentPlayerIndex = 0;
      } else {
        state.currentPlayerIndex += 1;
      }
    }
    setState({ currentScreen: Screen.PASS_DEVICE });
  };

  return el("div", { class: "card" }, [
    el("div", { class: "header" }, [
      el("div", { class: "title", text: "Phase 1 – Frage" }),
      el("div", { class: "badge" }, [
        el("span", { class: "badge-dot" }),
        currentPlayer().name,
      ]),
    ]),
    el("p", { class: "subtitle", text: "Schreibe eine Frage, auf die andere antworten müssen." }),
    el("div", { class: "section" }, [
      el("div", { class: "section-label", text: "Deine Frage" }),
      textarea,
      el("p", { class: "helper-text", text: "Beispiel: Wie findest du Angela Merkel?" }),
      el("p", { class: "warning-text", text: "(WENN DU NIX RICHTIGES SCHREIBEN DAN GIBT AUFS MAUL)" }),
    ]),
    el("div", { class: "btn-row" }, [
      el("button", { class: "btn-primary", onclick: next }, ["Fertig – weitergeben"]),
    ]),
  ]);
}

// Hilfsfunktion: mischen
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ensureQuestionOrder() {
  if (state.roundData.questionOrder && state.roundData.questionOrder.length === state.players.length) return;
  const n = state.players.length;
  const indices = [...Array(n).keys()];
  let perm;
  // einfache Neuversuche, bis niemand seine eigene Frage bekommt
  for (let tries = 0; tries < 20; tries++) {
    perm = shuffle(indices);
    if (!perm.some((target, i) => target === i)) {
      state.roundData.questionOrder = perm;
      return;
    }
  }
  state.roundData.questionOrder = indices.reverse();
}

// ----- Phase 2: Antworten schreiben -----

function renderPhaseAnswer() {
  const player = currentPlayer();
  if (!player) return renderLobby();

  ensureQuestionOrder();
  const playerIndex = state.players.findIndex((p) => p.id === player.id);
  const qIndex = state.roundData.questionOrder[playerIndex];
  const question = state.roundData.questions[qIndex];
  if (!question) return renderLobby();

  let answerObj = state.roundData.answers.find((a) => a.playerId === player.id);
  if (!answerObj) {
    answerObj = { playerId: player.id, questionOwnerId: question.playerId, text: "" };
    state.roundData.answers.push(answerObj);
  }

  const textarea = el("textarea", {
    class: "textarea",
    placeholder: "Deine Antwort…",
  });

  const next = () => {
    const text = textarea.value.trim();
    if (!text) return;
    answerObj.text = text;

    const isLast = state.currentPlayerIndex >= state.players.length - 1;
    if (isLast) {
      state.currentPlayerIndex = 0;
      state.phase = 3;
      setState({ currentScreen: Screen.PASS_DEVICE });
    } else {
      state.currentPlayerIndex += 1;
      setState({ currentScreen: Screen.PASS_DEVICE });
    }
  };

  return el("div", { class: "card" }, [
    el("div", { class: "header" }, [
      el("div", { class: "title", text: "Phase 2 – Antwort" }),
      el("div", { class: "badge" }, [
        el("span", { class: "badge-dot" }),
        currentPlayer().name,
      ]),
    ]),
    el("p", { class: "subtitle", text: "Du bekommst eine zufällige Frage von jemand anderem." }),
    el("div", { class: "question-card" }, [
      el("div", { class: "result-label", text: "Frage" }),
      el("div", { text: question.text }),
    ]),
    el("div", { class: "section" }, [
      el("div", { class: "section-label", text: "Deine Antwort" }),
      textarea,
      el("p", { class: "helper-text", text: "Beispiel: Boah, die ist schon stabil." }),
      el("p", { class: "warning-text", text: "(WENN DU NIX RICHTIGES SCHREIBEN DAN GIBT AUFS MAUL)" }),
    ]),
    el("div", { class: "btn-row" }, [
      el("button", { class: "btn-primary", onclick: next }, ["Fertig – weitergeben"]),
    ]),
  ]);
}

function ensureAnswerOrder() {
  if (state.roundData.answerOrder && state.roundData.answerOrder.length === state.players.length) return;
  const n = state.players.length;
  const indices = [...Array(n).keys()];
  let perm;
  for (let tries = 0; tries < 20; tries++) {
    perm = shuffle(indices);
    const ok = perm.every((target, i) => {
      const answer = state.roundData.answers[target];
      const player = state.players[i];
      return answer && player && answer.playerId !== player.id;
    });
    if (ok) {
      state.roundData.answerOrder = perm;
      return;
    }
  }
  state.roundData.answerOrder = indices.reverse();
}

// ----- Phase 3: Twisted Frage zu einer Antwort -----

function renderPhaseTwist() {
  const player = currentPlayer();
  if (!player) return renderLobby();

  ensureAnswerOrder();
  const playerIndex = state.players.findIndex((p) => p.id === player.id);
  const aIndex = state.roundData.answerOrder[playerIndex];
  const answerObj = state.roundData.answers[aIndex];
  if (!answerObj) return renderLobby();

  let twistObj = state.roundData.twisted.find((t) => t.playerId === player.id);
  if (!twistObj) {
    twistObj = { playerId: player.id, answerOwnerId: answerObj.playerId, text: "" };
    state.roundData.twisted.push(twistObj);
  }

  const textarea = el("textarea", {
    class: "textarea",
    placeholder: "Schreibe eine neue, absurde Frage zu dieser Antwort…",
  });

  const next = () => {
    const text = textarea.value.trim();
    if (!text) return;
    twistObj.text = text;

    const isLast = state.currentPlayerIndex >= state.players.length - 1;
    if (isLast) {
      setState({ currentScreen: Screen.RESULTS });
    } else {
      state.currentPlayerIndex += 1;
      setState({ currentScreen: Screen.PASS_DEVICE });
    }
  };

  return el("div", { class: "card" }, [
    el("div", { class: "header" }, [
      el("div", { class: "title", text: "Phase 3 – Verdrehte Frage" }),
      el("div", { class: "badge" }, [
        el("span", { class: "badge-dot" }),
        currentPlayer().name,
      ]),
    ]),
    el("p", { class: "subtitle", text: "Du siehst nur eine Antwort und baust die perfekte falsche Frage dazu." }),
    el("div", { class: "answer-card" }, [
      el("div", { class: "result-label", text: "Antwort" }),
      el("div", { class: "result-answer", text: '"' + (state.roundData.answers.find((a) => a.playerId === answerObj.playerId)?.text || "") + '"' }),
    ]),
    el("div", { class: "section" }, [
      el("div", { class: "section-label", text: "Neue Frage" }),
      textarea,
      el("p", { class: "helper-text", text: "Beispiel: Wie findet ihr die 12-jährige Rosa?" }),
      el("p", { class: "warning-text", text: "(WENN DU NIX RICHTIGES SCHREIBEN DAN GIBT AUFS MAUL)" }),
    ]),
    el("div", { class: "btn-row" }, [
      el("button", { class: "btn-primary", onclick: next }, ["Fertig – zu den Ergebnissen"]),
    ]),
  ]);
}

// ----- Ergebnisse -----

function renderResults() {
  // Baue eine Liste der Resultate (wie vorher)
  const items = state.roundData.twisted.map((tw) => {
    const answer = state.roundData.answers.find((a) => a.playerId === tw.answerOwnerId);
    const originalQuestion = answer
      ? state.roundData.questions.find((q) => q.playerId === answer.questionOwnerId)
      : null;
    return {
      id: tw.playerId + "_" + tw.answerOwnerId,
      twistedQuestion: tw.text,
      originalAnswer: answer ? answer.text : "",
      originalQuestion: originalQuestion ? originalQuestion.text : "",
      twistedBy: getPlayerName(tw.playerId),
      answerBy: answer ? getPlayerName(answer.playerId) : "",
    };
  });

  const total = items.length || 1;
  const index = Math.min(Math.max(state.resultsIndex, 0), total - 1);
  const current = items[index] || items[0];

  const again = () => {
    resetRound();
    setState({ currentScreen: Screen.PASS_DEVICE });
  };

  const backToLobby = () => {
    resetRound();
    setState({ currentScreen: Screen.LOBBY });
  };

  return el("div", { class: "card" }, [
    el("div", { class: "header" }, [
      el("div", { class: "title", text: "Ergebnisse" }),
      el("div", { class: "badge" }, [
        el("span", { class: "badge-dot" }),
        "Comment Runde",
      ]),
    ]),
    el("p", { class: "subtitle" }, [
      "Zeigt jeden Post nacheinander und ratet, wie die echte Frage dazu war.",
    ]),
    el("div", { class: "results-list" }, [
      el("div", { class: "result-item" }, [
        el("div", { class: "post-header" }, [
          el("div", { class: "post-avatar" }),
          el("div", { class: "post-meta" }, [
            el("div", { class: "post-name", text: current.twistedBy ? "@" + current.twistedBy : "@comment_game" }),
            el("div", { class: "post-time", text: current.answerBy ? "Antwort von " + current.answerBy : "vor 3 min" }),
          ]),
        ]),
        el("div", { class: "post-body" }, [
          el("div", { class: "post-caption", text: current.twistedQuestion || "(keine Frage)" }),
          el("div", { class: "result-answer", text: '"' + (current.originalAnswer || "") + '"' }),
          current.originalQuestion
            ? el("div", { class: "post-original", text: "Originalfrage: " + current.originalQuestion })
            : null,
        ]),
        el("div", { class: "post-stats", text: "Likes: " + (12 + index * 3) + " · Kommentare: " + (3 + index) }),
      ]),
      el("div", { class: "results-counter", text: "Post " + (index + 1) + " von " + total }),
    ]),
    el("div", { class: "results-controls" }, [
      el("button", {
        class: "btn-primary",
        onclick: () => {
          if (index < total - 1) {
            state.resultsIndex = index + 1;
            render();
          } else {
            again();
          }
        },
      }, [index < total - 1 ? "Naechster Post" : "Neue Runde starten"]),
      el("button", { class: "btn-ghost", onclick: backToLobby }, ["Zurueck zur Lobby"]),
    ]),
  ]);
}

function render() {
  app.innerHTML = "";

  let view;
  if (state.currentScreen === Screen.START) view = renderStart();
  else if (state.currentScreen === Screen.LOBBY) view = renderLobby();
  else if (state.currentScreen === Screen.PASS_DEVICE) {
    const next =
      state.phase === 1
        ? Screen.PHASE_QUESTION
        : state.phase === 2
        ? Screen.PHASE_ANSWER
        : Screen.PHASE_TWIST;
    view = renderPassDevice(next);
  } else if (state.currentScreen === Screen.PHASE_QUESTION) view = renderPhaseQuestion();
  else if (state.currentScreen === Screen.PHASE_ANSWER) view = renderPhaseAnswer();
  else if (state.currentScreen === Screen.PHASE_TWIST) view = renderPhaseTwist();
  else if (state.currentScreen === Screen.RESULTS) view = renderResults();
  else view = renderStart();

  app.appendChild(view);
}

render();
