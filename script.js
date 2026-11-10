document.addEventListener('DOMContentLoaded', () => {
  const formReserva = document.getElementById('formReserva');
  const formCelular = document.getElementById('formCelular');
  const corpoTabela = document.getElementById('corpoTabela');
  const mensagemAviso = document.getElementById('mensagemAviso');
  const btnExportar = document.getElementById('btnExportar');

  let registros = JSON.parse(localStorage.getItem('registrosIFPI')) || [];

  renderizarTabela();

  function converterParaMinutos(horarioStr) {
    const [horas, minutos] = horarioStr.split(':').map(Number);
    return horas * 60 + minutos;
  }

  // limites de horario
  function validarHorarios(inicioStr, fimStr) {
    const inicioMin = converterParaMinutos(inicioStr);
    const fimMin = converterParaMinutos(fimStr);
    const limiteMin = converterParaMinutos('07:00');
    const limiteMax = converterParaMinutos('22:00');

    if (inicioMin < limiteMin || fimMin > limiteMax) {
      return 'O horário de funcionamento é das 07:00 às 22:00.';
    }
    if (fimMin <= inicioMin) {
      return 'O horário de término deve ser posterior ao horário de início.';
    }
    if ((fimMin - inicioMin) < 60) {
      return 'O registro deve ter uma duração mínima de 1 hora.';
    }
    return null;
  }

  // reserva
  formReserva.addEventListener('submit', (e) => {
    e.preventDefault();

    const solicitante = document.getElementById('solicitante').value.trim();
    const espaco = document.getElementById('espaco').value;
    const diaSemana = document.getElementById('diaSemana').value;
    const horarioInicio = document.getElementById('horarioInicio').value;
    const horarioFim = document.getElementById('horarioFim').value;
    const finalidade = document.getElementById('finalidade').value.trim();

    const erroHorario = validarHorarios(horarioInicio, horarioFim);
    if (erroHorario) {
      exibirMensagem(erroHorario, 'erro');
      return;
    }

    const inicioMin = converterParaMinutos(horarioInicio);
    const fimMin = converterParaMinutos(horarioFim);

    // sem reservas no msm hr
    const conflito = registros.some(r => {
      if (r.tipo === 'Reserva' && r.espaco === espaco && r.diaSemana === diaSemana) {
        const rInicio = converterParaMinutos(r.horarioInicio);
        const rFim = converterParaMinutos(r.horarioFim);
        return (inicioMin < rFim && fimMin > rInicio);
      }
      return false;
    });

    if (conflito) {
      exibirMensagem(`O espaço "${espaco}" já está reservado nesse horário na ${diaSemana}.`);
      return;
    }

    const novoRegistro = {
      id: Date.now(),
      tipo: 'Reserva',
      espaco,
      espacoTurma: espaco,
      diaSemana,
      horarioInicio,
      horarioFim,
      diaHorario: `${diaSemana} (${horarioInicio} - ${horarioFim})`,
      responsavel: solicitante,
      detalhes: finalidade
    };

    registros.push(novoRegistro);
    salvarLocalStorage();
    renderizarTabela();
    formReserva.reset();
    exibirMensagem('Reserva cadastrada com sucesso!', 'sucesso');
  });

  // form do celular
  formCelular.addEventListener('submit', (e) => {
    e.preventDefault();

    const professor = document.getElementById('professorCelular').value.trim();
    const turma = document.getElementById('turmaCelular').value;
    const dia = document.getElementById('diaCelular').value;
    const horarioInicio = document.getElementById('horarioInicioCelular').value;
    const horarioFim = document.getElementById('horarioFimCelular').value;
    const motivo = document.getElementById('motivoCelular').value.trim();

    const erroHorario = validarHorarios(horarioInicio, horarioFim);
    if (erroHorario) {
      exibirMensagem(erroHorario, 'erro');
      return;
    }

    const inicioMin = converterParaMinutos(horarioInicio);
    const fimMin = converterParaMinutos(horarioFim);

    // sem lib no mesmo hr
    const conflitoTurma = registros.some(r => {
      if (r.tipo === 'Celular' && r.turma === turma && r.diaSemana === dia) {
        const rInicio = converterParaMinutos(r.horarioInicio);
        const rFim = converterParaMinutos(r.horarioFim);
        return (inicioMin < rFim && fimMin > rInicio);
      }
      return false;
    });

    if (conflitoTurma) {
      exibirMensagem(`A turma "${turma}" já possui liberação de celular cadastrada neste horário (${dia}).`);
      return;
    }

    const novoRegistro = {
      id: Date.now(),
      tipo: 'Celular',
      turma,
      espacoTurma: `Turma: ${turma}`,
      diaSemana: dia,
      horarioInicio,
      horarioFim,
      diaHorario: `${dia} (${horarioInicio} - ${horarioFim})`,
      responsavel: professor,
      detalhes: `Celular liberado: ${motivo}`
    };

    registros.push(novoRegistro);
    salvarLocalStorage();
    renderizarTabela();
    formCelular.reset();
    exibirMensagem('Autorização de celular cadastrada com sucesso');
  });

  function renderizarTabela() {
    corpoTabela.innerHTML = '';

    if (registros.length === 0) {
      corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #888;">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    registros.forEach(r => {
      const tr = document.createElement('tr');
      const badgeClass = r.tipo === 'Reserva' ? 'reserva' : 'celular';
      const badgeText = r.tipo === 'Reserva' ? 'Reserva de Espaço' : 'Uso de Celular';

      tr.innerHTML = `
        <td><span class="badge-tipo ${badgeClass}">${badgeText}</span></td>
        <td><strong>${r.espacoTurma}</strong></td>
        <td>${r.diaHorario}</td>
        <td>${r.responsavel}</td>
        <td>${r.detalhes}</td>
        <td><button class="btn-cancelar" data-id="${r.id}">Excluir</button></td>
      `;
      corpoTabela.appendChild(tr);
    });

    document.querySelectorAll('.btn-cancelar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.target.getAttribute('data-id'));
        removerRegistro(id);
      });
    });
  }

  function removerRegistro(id) {
    registros = registros.filter(r => r.id !== id);
    salvarLocalStorage();
    renderizarTabela();
    exibirMensagem('Registro removido com sucesso.');
  }

  function salvarLocalStorage() {
    localStorage.setItem('registrosIFPI', JSON.stringify(registros));
  }

  function exibirMensagem(texto, tipo) {
    mensagemAviso.textContent = texto;
    mensagemAviso.className = `mensagem-aviso ${tipo}`;
    setTimeout(() => {
      mensagemAviso.className = 'mensagem-aviso hidden';
    }, 4500);
  }

  btnExportar.addEventListener('click', () => {
    if (registros.length === 0) {
      exibirMensagem('Não há dados para exportar.', 'erro');
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registros, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dados_ifpi_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
});