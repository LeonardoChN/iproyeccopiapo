const PUBLIC_EVENTS_CONFIG = {
  supabaseUrl: "https://htpqqwxadceqrtljmhry.supabase.co",
  supabaseAnonKey: "sb_publishable_BPslwRYNL3yd39kWUpxfAw_VmCWrg8T",
  eventosTable: "eventos"
};

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("#eventsGrid");
  const loadingState = document.querySelector("#loadingState");
  const emptyState = document.querySelector("#emptyState");
  const errorState = document.querySelector("#errorState");
  const modal = document.querySelector("#eventModal");
  const modalMedia = document.querySelector("#modalMedia");
  const modalTitle = document.querySelector("#modalTitle");
  const modalDate = document.querySelector("#modalDate");
  const modalDescription = document.querySelector("#modalDescription");

  let publishedEvents = [];

  function hideStatusCards() {
    if (loadingState) loadingState.hidden = true;
    if (emptyState) emptyState.hidden = true;
    if (errorState) errorState.hidden = true;
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Fecha por confirmar";

    const [year, month, day] = String(dateValue).split("-").map(Number);
    if (!year || !month || !day) return "Fecha por confirmar";

    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function isValidPublicImage(url) {
    if (!url) return false;

    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  function buildPlaceholder() {
    const wrapper = document.createElement("div");
    wrapper.className = "public-event-card__placeholder";

    const img = document.createElement("img");
    img.src = "../img/Trazo Logo blanco Iproyec 1.png";
    img.alt = "Logo IPROYEC";

    wrapper.appendChild(img);
    return wrapper;
  }

  function buildImage(src, title) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `Imagen del evento ${title || "IPROYEC"}`;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      const parent = img.parentElement;
      if (!parent) return;
      parent.innerHTML = "";
      parent.appendChild(buildPlaceholder());
    });

    return img;
  }

  function openModal(event) {
    if (!modal) return;

    modalMedia.innerHTML = "";
    if (isValidPublicImage(event.imagen_url)) {
      modalMedia.appendChild(buildImage(event.imagen_url, event.titulo));
    } else {
      modalMedia.appendChild(buildPlaceholder());
    }

    modalTitle.textContent = event.titulo || "Evento IPROYEC";
    modalDate.textContent = `Fecha del evento: ${formatDate(event.fecha_evento)}`;
    modalDescription.textContent = event.descripcion || "Este evento aún no tiene una descripción disponible.";

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function renderEvents(events) {
    grid.innerHTML = "";

    events.forEach((event) => {
      const card = document.createElement("article");
      card.className = "public-event-card";

      const media = document.createElement("div");
      media.className = "public-event-card__media";
      if (isValidPublicImage(event.imagen_url)) {
        media.appendChild(buildImage(event.imagen_url, event.titulo));
      } else {
        media.appendChild(buildPlaceholder());
      }

      const body = document.createElement("div");
      body.className = "public-event-card__body";

      const tag = document.createElement("span");
      tag.className = "event-card__tag";
      tag.textContent = "Evento publicado";

      const title = document.createElement("h3");
      title.textContent = event.titulo || "Evento IPROYEC";

      const date = document.createElement("span");
      date.className = "public-event-card__date";
      date.textContent = `📅 ${formatDate(event.fecha_evento)}`;

      const description = document.createElement("p");
      description.className = "public-event-card__description";
      description.textContent = event.descripcion || "Este evento aún no tiene una descripción disponible.";

      const actions = document.createElement("div");
      actions.className = "public-event-card__actions";

      const detailButton = document.createElement("button");
      detailButton.className = "btn btn-card";
      detailButton.type = "button";
      detailButton.textContent = "Ver detalle";
      detailButton.addEventListener("click", () => openModal(event));

      actions.appendChild(detailButton);
      body.append(tag, title, date, description, actions);
      card.append(media, body);
      grid.appendChild(card);
    });
  }

  async function loadPublishedEvents() {
    if (!window.supabase) {
      hideStatusCards();
      errorState.hidden = false;
      console.error("No se pudo cargar Supabase JS.");
      return;
    }

    const client = window.supabase.createClient(
      PUBLIC_EVENTS_CONFIG.supabaseUrl,
      PUBLIC_EVENTS_CONFIG.supabaseAnonKey
    );

    try {
      const { data, error } = await client
        .from(PUBLIC_EVENTS_CONFIG.eventosTable)
        .select("id,titulo,descripcion,imagen_url,fecha_evento,estado,created_at")
        .eq("estado", "publicado")
        .order("fecha_evento", { ascending: true });

      if (error) throw error;

      publishedEvents = data || [];
      hideStatusCards();

      if (publishedEvents.length === 0) {
        emptyState.hidden = false;
        return;
      }

      renderEvents(publishedEvents);
    } catch (error) {
      console.error("Error cargando eventos publicados:", error);
      hideStatusCards();
      errorState.hidden = false;
    }
  }

  document.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  loadPublishedEvents();
});
