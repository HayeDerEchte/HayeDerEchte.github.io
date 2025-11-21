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
  roundData: {
    questions: [], // { playerId, text }
    answers: [], // { playerId, questionOwnerId, text }
    twisted: [], // { playerId, answerOwnerId, text }
  },
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
  };
  state.currentPlayerIndex = 0;
  state.phase = 1;
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

    const isLast = state.currentPlayerIndex >= state.players.length - 1;
    if (isLast) {
      // Nächste Phase vorbereiten: Antworten
      state.currentPlayerIndex = 0;
      state.phase = 2;
      setState({ currentScreen: Screen.PASS_DEVICE });
    } else {
      state.currentPlayerIndex += 1;
      setState({ currentScreen: Screen.PASS_DEVICE });
    }
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

// Ordnet für Phase 2 jedem Spieler eine zufällige Frage (nicht seine eigene) zu
function getQuestionForPlayer(playerId) {
  const others = state.roundData.questions.filter((q) => q.playerId !== playerId);
  const pool = others.length ? others : state.roundData.questions;
  const shuffled = shuffle(pool);
  return shuffled[0] || null;
}

// ----- Phase 2: Antworten schreiben -----

function renderPhaseAnswer() {
  const player = currentPlayer();
  if (!player) return renderLobby();

  const existing = state.roundData.answers.find((a) => a.playerId === player.id);
  let question = null;
  if (existing) {
    question = state.roundData.questions.find((q) => q.playerId === existing.questionOwnerId) || null;
  } else {
    const q = getQuestionForPlayer(player.id);
    question = q;
  }

  if (!question) return renderLobby();

  // Falls noch keine Zuordnung gespeichert, jetzt speichern (damit bei Refresh der Reihenfolge stabil bleibt)
  if (!existing) {
    state.roundData.answers.push({ playerId: player.id, questionOwnerId: question.playerId, text: "" });
  }

  const answerObj = state.roundData.answers.find((a) => a.playerId === player.id);

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
    ]),
    el("div", { class: "btn-row" }, [
      el("button", { class: "btn-primary", onclick: next }, ["Fertig – weitergeben"]),
    ]),
  ]);
}

// Ordnet für Phase 3 jedem Spieler eine zufällige Antwort zu
function getAnswerForPlayer(playerId) {
  const others = state.roundData.answers.filter((a) => a.playerId !== playerId && a.text.trim());
  const pool = others.length ? others : state.roundData.answers.filter((a) => a.text.trim());
  const shuffled = shuffle(pool);
  return shuffled[0] || null;
}

// ----- Phase 3: Twisted Frage zu einer Antwort -----

function renderPhaseTwist() {
  const player = currentPlayer();
  if (!player) return renderLobby();

  const existing = state.roundData.twisted.find((t) => t.playerId === player.id);
  let answerObj = null;
  if (existing) {
    answerObj = state.roundData.answers.find((a) => a.playerId === existing.answerOwnerId) || null;
  } else {
    answerObj = getAnswerForPlayer(player.id);
  }

  if (!answerObj) return renderLobby();

  if (!existing) {
    state.roundData.twisted.push({ playerId: player.id, answerOwnerId: answerObj.playerId, text: "" });
  }

  const twistObj = state.roundData.twisted.find((t) => t.playerId === player.id);

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
    ]),
    el("div", { class: "btn-row" }, [
      el("button", { class: "btn-primary", onclick: next }, ["Fertig – zu den Ergebnissen"]),
    ]),
  ]);
}

// ----- Ergebnisse -----

function renderResults() {
  // Versuche, für jede gedrehte Frage die ursprüngliche Antwort und Frage zu finden
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
    };
  });

  const list = el("div", { class: "results-list" }, items.map((item) =>
    el("div", { class: "result-item" }, [
      el("div", { class: "result-label", text: "Verdrehte Kombination" }),
      el("div", { class: "result-question", text: item.twistedQuestion }),
      el("div", { class: "result-answer", text: '"' + item.originalAnswer + '"' }),
      item.originalQuestion
        ? el("div", { class: "helper-text", text: "Originalfrage: " + item.originalQuestion })
        : null,
    ])
  ));

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
      "Lest die Kombos laut vor und ratet, welche Antwort zu welcher echten Frage gehört.",
    ]),
    list,
    el("div", { class: "btn-row" }, [
      el("button", { class: "btn-primary", onclick: again }, ["Noch eine Runde"]),
      el("button", { class: "btn-ghost", onclick: backToLobby }, ["Zurück zur Lobby"]),
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
