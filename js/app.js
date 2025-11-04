// app.js - todo el código funcional
document.addEventListener('DOMContentLoaded', () => {
    // util
    const $ = id => document.getElementById(id);
    const qs = sel => document.querySelector(sel);
    const qsa = sel => document.querySelectorAll(sel);
    const money = v => Number(v || 0).toLocaleString('es-CO');

    // storage helpers
    const DB = {
        load(k, d) {
            try {
                const raw = localStorage.getItem(k);
                return raw ? JSON.parse(raw) : d;
            } catch (e) {
                return d;
            }
        },
        save(k, v) {
            localStorage.setItem(k, JSON.stringify(v));
        }
    };

    // data
    let goals = DB.load('goals', []);
    let journal = DB.load('journal', []);
    let micros = DB.load('micros', []);
    let reminders = DB.load('reminders', []);
    let activeGoal = DB.load('activeGoal', null);

    // UI refs
    const goalsList = qs('#goalsList');
    const totalSavedEl = qs('#totalSaved');
    const activeGoalTitle = qs('#activeGoalTitle');
    const journalList = qs('#journal');
    const microsList = qs('#micros');
    const remindersList = qs('#remindersList');

    // render functions
    function renderSidebarTotals() {
        const total = goals.reduce((s, g) => s + Number(g.saved || 0), 0);
        totalSavedEl.textContent = '$' + money(total);
        if (activeGoal !== null && goals[activeGoal]) {
            activeGoalTitle.textContent = `${goals[activeGoal].name} — $${money(goals[activeGoal].saved)}`;
        } else {
            activeGoalTitle.textContent = '—';
        }
    }

    function renderGoals() {
        goalsList.innerHTML = '';
        if (goals.length === 0) {
            goalsList.innerHTML = '<div class="muted">No hay metas. Crea una usando el formulario arriba.</div>';
            return;
        }
        goals.forEach((g, idx) => {
            const percent = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
            const div = document.createElement('div');
            div.className = 'goal';
            div.dataset.idx = idx;
            div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${g.name}</strong><div class="tiny muted">Meta: $${money(g.target)}</div></div>
          <div style="text-align:right">
            <div class="tiny">${percent.toFixed(1)}%</div>
            <div class="tiny muted">Guardado: $${money(g.saved)}</div>
          </div>
        </div>
        <div class="progress"><i style="width:${percent}%"></i></div>
        <div class="goal-controls">
          <button class="small selectBtn" data-idx="${idx}">${activeGoal === idx ? 'Activa' : 'Seleccionar'}</button>
          <button class="small contribBtn" data-idx="${idx}">Aportar</button>
          <button class="small" data-idx="${idx}" style="background:#ffb4a2;color:#2b0600;border:none;border-radius:8px">Eliminar</button>
        </div>
      `;
            goalsList.appendChild(div);
        });

        // attach handlers (delegation is simpler but here we attach per button)
        qsa('.selectBtn').forEach(b => b.onclick = (e) => {
            const i = Number(b.dataset.idx);
            activeGoal = i;
            DB.save('activeGoal', activeGoal);
            renderAll();
        });
        qsa('.contribBtn').forEach(b => b.onclick = (e) => {
            const i = Number(b.dataset.idx);
            const val = prompt('Ingrese monto a aportar (número):', '0');
            const n = Number(val);
            if (isNaN(n) || n <= 0) return alert('Monto inválido.');
            goals[i].saved = Number(goals[i].saved || 0) + n;
            DB.save('goals', goals);
            renderAll();
        });
        qsa('.goal-controls button[style*="Eliminar"]').forEach(b => b.onclick = () => {
            const i = Number(b.dataset.idx);
            if (!confirm(`Eliminar la meta "${goals[i].name}"?`)) return;
            goals.splice(i, 1);
            if (activeGoal !== null && activeGoal === i) activeGoal = null;
            DB.save('goals', goals);
            DB.save('activeGoal', activeGoal);
            renderAll();
        });
    }

    function renderJournal() {
        journalList.innerHTML = '';
        if (journal.length === 0) {
            journalList.innerHTML = '<div class="muted">No hay entradas en la bitácora aún.</div>';
            return;
        }
        journal.slice().reverse().forEach(entry => {
            const el = document.createElement('div');
            el.className = 'note';
            el.innerHTML = `<div style="display:flex;justify-content:space-between"><strong>${entry.mood || 'Reflexión'}</strong><div class="tiny muted">${new Date(entry.ts).toLocaleString()}</div></div><div class="muted tiny" style="margin-top:6px">${entry.note || ''}</div>`;
            journalList.appendChild(el);
        });
    }

    function renderMicros() {
        microsList.innerHTML = '';
        if (micros.length === 0) {
            microsList.innerHTML = '<li class="muted">Sin microacciones</li>';
            return;
        }
        micros.forEach((m, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<label><input type="checkbox" data-i="${i}" ${m.done ? 'checked' : ''}/> ${m.text} <span class="tiny muted"> — ${new Date(m.ts).toLocaleDateString()}</span></label>`;
            microsList.appendChild(li);
        });
        qsa('#micros input[type=checkbox]').forEach(cb => cb.onchange = () => {
            const i = Number(cb.dataset.i);
            micros[i].done = cb.checked;
            DB.save('micros', micros);
        });
    }

    function renderReminders() {
        if (reminders.length === 0) {
            remindersList.textContent = '—';
            return;
        }
        remindersList.textContent = reminders.map(r => `${new Date(r.ts).toLocaleString()} — ${r.msg}`).join('\n');
    }

    function renderAll() {
        renderGoals();
        renderJournal();
        renderMicros();
        renderSidebarTotals();
        renderReminders();
    }

    // initial render
    renderAll();

    // UI interactions
    // create goal
    qs('#createGoal').onclick = () => {
        const name = qs('#newGoalName').value.trim();
        const target = Number(qs('#newGoalTarget').value);
        if (!name || isNaN(target) || target <= 0) {
            return alert('Ingresar nombre y monto objetivo válidos.');
        }
        goals.push({ name, target, saved: 0 });
        DB.save('goals', goals);
        qs('#newGoalName').value = '';
        qs('#newGoalTarget').value = '';
        // set active to newly created
        activeGoal = goals.length - 1;
        DB.save('activeGoal', activeGoal);
        renderAll();
    };

    // Contribuir desde sidebar
    qs('#addContrib').onclick = () => {
        if (activeGoal === null || goals[activeGoal] === undefined) {
            return alert('Selecciona una meta para aportar.');
        }
        const val = Number(qs('#contribAmount').value);
        if (isNaN(val) || val <= 0) return alert('Ingresa un monto válido.');
        goals[activeGoal].saved = Number(goals[activeGoal].saved || 0) + val;
        DB.save('goals', goals);
        qs('#contribAmount').value = '';
        renderAll();
    };

    // run simulator
    qs('#runSim').onclick = () => {
        const name = qs('#simName').value || 'Meta';
        const target = Number(qs('#simTarget').value);
        const months = Number(qs('#simMonths').value);
        if (!target || !months || target <= 0 || months <= 0) return alert('Ingrese monto objetivo y meses válidos.');
        const perMonth = Math.ceil(target / months);
        qs('#simResult').textContent = `${name}: Debes ahorrar $${money(perMonth)} por mes durante ${months} meses.`;
    };

    qs('#saveAsGoal').onclick = () => {
        const name = qs('#simName').value || prompt('Nombre de la meta?') || 'Meta';
        const target = Number(qs('#simTarget').value);
        if (!target || target <= 0) return alert('Necesitas un monto objetivo.');
        goals.push({ name, target, saved: 0 });
        DB.save('goals', goals);
        activeGoal = goals.length - 1;
        DB.save('activeGoal', activeGoal);
        renderAll();
    };

    // journal
    qs('#addNote').onclick = () => {
        const mood = qs('#mood').value.trim();
        const note = qs('#moodNote').value.trim();
        if (!mood && !note) return alert('Escribe algo sobre cómo te sientes.');
        journal.push({ mood, note, ts: Date.now() });
        DB.save('journal', journal);
        qs('#mood').value = '';
        qs('#moodNote').value = '';
        renderAll();
    };

    qs('#clearNotes').onclick = () => {
        if (!confirm('Borrar toda la bitácora?')) return;
        journal = [];
        DB.save('journal', journal);
        renderAll();
    };

    // microactions
    qs('#addMicro').onclick = () => {
        const text = qs('#microText').value.trim();
        if (!text) return;
        micros.push({ text, ts: Date.now(), done: false });
        DB.save('micros', micros);
        qs('#microText').value = '';
        renderAll();
    };

    // reminders (simple)
    qs('#setReminder').onclick = () => {
        const minutes = Number(qs('#quickReminder').value);
        if (isNaN(minutes) || minutes <= 0) return alert('Ingresa minutos válidos');
        const ts = Date.now() + minutes * 60 * 1000;
        const msg = 'Recordatorio — revisa tu ahorro o registra en la bitácora';
        reminders.push({ ts, msg });
        DB.save('reminders', reminders);
        qs('#quickReminder').value = '';
        // ask for notification permission
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
        renderAll();
    };

    // check reminders periodically
    function checkReminders() {
        const now = Date.now();
        const due = reminders.filter(r => r.ts <= now);
        if (due.length > 0) {
            due.forEach(r => {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(r.msg);
                } else {
                    // fallback alert
                    alert(r.msg);
                }
            });
            reminders = reminders.filter(r => r.ts > now);
            DB.save('reminders', reminders);
            renderAll();
        }
    }
    setInterval(checkReminders, 5000);

    // daily gentle reminder (one alert per day)
    function dailyReminder() {
        const now = new Date();
        const todayKey = 'lastDailyReminder';
        const last = DB.load(todayKey, null);
        const today = now.toDateString();
        if (last !== today) {
            // show non-blocking reminder
            // prefer Notification if allowed
            const msg = 'Recuerda revisar tus metas y escribir en tu bitácora.';
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(msg);
            } else {
                // do not spam alerts on load; use console and a subtle alert
                // For first use we show alert to inform about notifications
                if (Notification && Notification.permission === 'default') {
                    // ask permission but don't show alert yet
                    Notification.requestPermission().then(() => { });
                } else {
                    // show a mild alert once per day
                    console.log(msg);
                }
            }
            DB.save(todayKey, today);
        }
    }
    dailyReminder();

    // listen to storage events to sync across tabs
    window.addEventListener('storage', () => {
        goals = DB.load('goals', []);
        journal = DB.load('journal', []);
        micros = DB.load('micros', []);
        reminders = DB.load('reminders', []);
        activeGoal = DB.load('activeGoal', null);
        renderAll();
    });
});
