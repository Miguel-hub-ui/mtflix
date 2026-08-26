"use strict";

const TMDB_API_KEY = "d3f97b423b8ea5b94ed9e7a5804c0e96";

const API_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/";
const LS_KEY = "cineverse_api_key";
const LS_LIST = "cineverse_watchlist";
const LS_PROGRESS = "cineverse_progress";

const PLAYER_SERVER = {
  movie: "https://www.vidking.net/embed/movie/{id}",
  tv: "https://www.vidking.net/embed/tv/{id}/{season}/{episode}",
  color: "e50914",
};

let currentPlayer = null;

const LS_PROFILES = "cineverse_profiles";
const LS_SESSION = "cineverse_session";
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#e50914,#7a0008)",
  "linear-gradient(135deg,#6c5ce7,#341f97)",
  "linear-gradient(135deg,#0984e3,#083b66)",
  "linear-gradient(135deg,#00b894,#00694f)",
  "linear-gradient(135deg,#fdcb6e,#b8860b)",
  "linear-gradient(135deg,#e17055,#8b3a2b)",
  "linear-gradient(135deg,#fd79a8,#a4135c)",
  "linear-gradient(135deg,#636e72,#2d3436)",
];
let appStarted = false;
let gateEditing = false;
let editorState = null;
let editingProfileId = null;
let listTab = "list";

const LS_USERS = "cineverse_users";
const LS_AUTH = "cineverse_auth";
const LS_TRACK = "cineverse_track";
const TRACK_STATUSES = [
  { id: "plan", label: "Plan to Watch" },
  { id: "watching", label: "Watching" },
  { id: "completed", label: "Completed" },
  { id: "hold", label: "On Hold" },
  { id: "dropped", label: "Dropped" },
];
const STATUS_MAP = Object.fromEntries(TRACK_STATUSES.map((s) => [s.id, s.label]));

const DICE_STYLES = ["adventurer", "bottts", "fun-emoji", "lorelei", "micah", "pixel-art", "thumbs"];

const I18N = {
  en: {
    nav_home: "Home", nav_movies: "Movies", nav_tv: "TV Shows", nav_list: "My List",
    search_ph: "Titles, people, genres",
    gate_title: "Who's watching?", gate_manage: "Manage Profiles",
    menu_settings: "Settings", menu_manage: "Manage Profiles", menu_switch: "Switch Profile", menu_signout: "Sign Out",
    auth_in: "Sign In", auth_up: "Sign Up", auth_email: "Email", auth_pass: "Password",
    auth_pass_min: "Password (min 6 characters)", auth_pass2: "Confirm password", auth_name: "Display name",
    signin_btn: "Sign In", signup_btn: "Create Account", guest_link: "Continue as guest",
    verify_title: "Check your email", pin_enter_title: "Enter profile PIN", cancel: "Cancel",
    settings_title: "Settings", sec_playback: "Playback", sec_language: "Language", sec_privacy: "Privacy & Security",
    set_autoplay_label: "Auto-play next episode", set_autoplay_desc: "When an episode ends, automatically start the next one.",
    set_lang_desc: "App interface and movie descriptions language.",
    privacy_pin_desc: "Require a 4-digit PIN to open this profile.",
    pin_new: "New PIN (4 digits)", pin_confirm: "Confirm PIN", pin_current: "Current PIN", pin_save: "Save",
    pin_enable: "Enable PIN", pin_change: "Change PIN", pin_disable: "Disable PIN", pin_enabled_on: "PIN protection is ON for this profile.",
    pw_desc: "Update the password for your MTFlix account.", pw_current: "Current password", pw_new: "New password",
    pw_confirm: "Confirm new password", pw_update: "Update Password",
    profile_add_title: "Add a profile", profile_edit_title: "Edit profile",
    profile_name_ph: "Name", profile_save: "Save", profile_cancel: "Cancel", profile_delete: "Delete",
    tab_colors: "Colors", tab_avatars: "Avatars", tab_custom: "Custom", btn_upload: "Choose Image", btn_random: "🎲 Random",
    list_watchlist: "Watchlist", list_tracking: "Tracking",
    hdr_trailer: "Watch Trailer", hdr_play: "Play", hdr_resume: "Resume",
    mylist_add: "Add to My List", mylist_in: "In My List ✓",
    st_plan: "Plan to Watch", st_watching: "Watching", st_completed: "Completed", st_hold: "On Hold", st_dropped: "Dropped",
    row_trending: "Trending Now", row_popmovies: "Popular Movies", row_toprated: "Top Rated of All Time",
    row_poptv: "Binge-Worthy TV Shows", row_action: "Action & Adventure", row_scifi: "Sci-Fi Worlds",
    row_horror: "Lights Off — Horror", row_comedy: "Comedies to Chill With", row_animation: "Animation for Everyone",
    row_romance: "Romance Night In", row_airing: "Airing This Week", row_continue: "Continue Watching",
  },
  es: {
    nav_home: "Inicio", nav_movies: "Películas", nav_tv: "Series", nav_list: "Mi Lista",
    search_ph: "Títulos, personas, géneros",
    gate_title: "¿Quién está viendo?", gate_manage: "Administrar perfiles",
    menu_settings: "Ajustes", menu_manage: "Administrar perfiles", menu_switch: "Cambiar perfil", menu_signout: "Cerrar sesión",
    auth_in: "Iniciar sesión", auth_up: "Registrarse", auth_email: "Correo electrónico", auth_pass: "Contraseña",
    auth_pass_min: "Contraseña (mínimo 6 caracteres)", auth_pass2: "Confirmar contraseña", auth_name: "Nombre visible",
    signin_btn: "Iniciar sesión", signup_btn: "Crear cuenta", guest_link: "Continuar como invitado",
    verify_title: "Revisa tu correo", pin_enter_title: "Introduce el PIN del perfil", cancel: "Cancelar",
    settings_title: "Ajustes", sec_playback: "Reproducción", sec_language: "Idioma", sec_privacy: "Privacidad y seguridad",
    set_autoplay_label: "Reproducir siguiente episodio automáticamente", set_autoplay_desc: "Cuando termina un episodio, empieza el siguiente automáticamente.",
    set_lang_desc: "Idioma de la interfaz y de las descripciones.",
    privacy_pin_desc: "Pedir un PIN de 4 dígitos para abrir este perfil.",
    pin_new: "PIN nuevo (4 dígitos)", pin_confirm: "Confirmar PIN", pin_current: "PIN actual", pin_save: "Guardar",
    pin_enable: "Activar PIN", pin_change: "Cambiar PIN", pin_disable: "Desactivar PIN", pin_enabled_on: "La protección por PIN está ACTIVADA para este perfil.",
    pw_desc: "Actualiza la contraseña de tu cuenta MTFlix.", pw_current: "Contraseña actual", pw_new: "Contraseña nueva",
    pw_confirm: "Confirmar nueva contraseña", pw_update: "Actualizar contraseña",
    profile_add_title: "Añadir un perfil", profile_edit_title: "Editar perfil",
    profile_name_ph: "Nombre", profile_save: "Guardar", profile_cancel: "Cancelar", profile_delete: "Eliminar",
    tab_colors: "Colores", tab_avatars: "Avatares", tab_custom: "Personalizado", btn_upload: "Elegir imagen", btn_random: "🎲 Aleatorio",
    list_watchlist: "Mi Lista", list_tracking: "Seguimiento",
    hdr_trailer: "Ver tráiler", hdr_play: "Reproducir", hdr_resume: "Reanudar",
    mylist_add: "Añadir a Mi Lista", mylist_in: "En Mi Lista ✓",
    st_plan: "Pendiente", st_watching: "Viendo", st_completed: "Completado", st_hold: "En pausa", st_dropped: "Abandonado",
    row_trending: "Tendencias", row_popmovies: "Películas populares", row_toprated: "Las mejor valoradas",
    row_poptv: "Series para maratón", row_action: "Acción y aventura", row_scifi: "Mundos de ciencia ficción",
    row_horror: "Apaga la luz — Terror", row_comedy: "Comedias para relajar", row_animation: "Animación para todos",
    row_romance: "Noche romántica", row_airing: "Al aire esta semana", row_continue: "Seguir viendo",
  },
  fr: {
    nav_home: "Accueil", nav_movies: "Films", nav_tv: "Séries", nav_list: "Ma Liste",
    search_ph: "Titres, personnes, genres",
    gate_title: "Qui est-ce ?", gate_manage: "Gérer les profils",
    menu_settings: "Paramètres", menu_manage: "Gérer les profils", menu_switch: "Changer de profil", menu_signout: "Se déconnecter",
    auth_in: "Se connecter", auth_up: "S'inscrire", auth_email: "E-mail", auth_pass: "Mot de passe",
    auth_pass_min: "Mot de passe (min. 6 caractères)", auth_pass2: "Confirmer le mot de passe", auth_name: "Nom affiché",
    signin_btn: "Se connecter", signup_btn: "Créer un compte", guest_link: "Continuer en invité",
    verify_title: "Vérifiez votre e-mail", pin_enter_title: "Entrez le code du profil", cancel: "Annuler",
    settings_title: "Paramètres", sec_playback: "Lecture", sec_language: "Langue", sec_privacy: "Confidentialité et sécurité",
    set_autoplay_label: "Lecture auto de l'épisode suivant", set_autoplay_desc: "À la fin d'un épisode, lance automatiquement le suivant.",
    set_lang_desc: "Langue de l'interface et des descriptions.",
    privacy_pin_desc: "Exiger un code à 4 chiffres pour ouvrir ce profil.",
    pin_new: "Nouveau code (4 chiffres)", pin_confirm: "Confirmer le code", pin_current: "Code actuel", pin_save: "Enregistrer",
    pin_enable: "Activer le code", pin_change: "Modifier le code", pin_disable: "Désactiver le code", pin_enabled_on: "La protection par code est ACTIVE pour ce profil.",
    pw_desc: "Mettez à jour le mot de passe de votre compte MTFlix.", pw_current: "Mot de passe actuel", pw_new: "Nouveau mot de passe",
    pw_confirm: "Confirmer le nouveau mot de passe", pw_update: "Mettre à jour",
    profile_add_title: "Ajouter un profil", profile_edit_title: "Modifier le profil",
    profile_name_ph: "Nom", profile_save: "Enregistrer", profile_cancel: "Annuler", profile_delete: "Supprimer",
    tab_colors: "Couleurs", tab_avatars: "Avatars", tab_custom: "Personnalisé", btn_upload: "Choisir une image", btn_random: "🎲 Aléatoire",
    list_watchlist: "Ma Liste", list_tracking: "Suivi",
    hdr_trailer: "Voir la bande-annonce", hdr_play: "Lecture", hdr_resume: "Reprendre",
    mylist_add: "Ajouter à Ma Liste", mylist_in: "Dans Ma Liste ✓",
    st_plan: "À voir", st_watching: "En cours", st_completed: "Terminé", st_hold: "En pause", st_dropped: "Abandonné",
    row_trending: "Tendances", row_popmovies: "Films populaires", row_toprated: "Les mieux notés",
    row_poptv: "Séries à dévorer", row_action: "Action et aventure", row_scifi: "Univers science-fiction",
    row_horror: "Lumières éteintes — Horreur", row_comedy: "Comédies détente", row_animation: "Animation pour tous",
    row_romance: "Soirée romance", row_airing: "Diffusées cette semaine", row_continue: "Reprendre",
  },
  de: {
    nav_home: "Startseite", nav_movies: "Filme", nav_tv: "Serien", nav_list: "Meine Liste",
    search_ph: "Titel, Personen, Genres",
    gate_title: "Wer schaut zu?", gate_manage: "Profile verwalten",
    menu_settings: "Einstellungen", menu_manage: "Profile verwalten", menu_switch: "Profil wechseln", menu_signout: "Abmelden",
    auth_in: "Anmelden", auth_up: "Registrieren", auth_email: "E-Mail", auth_pass: "Passwort",
    auth_pass_min: "Passwort (mind. 6 Zeichen)", auth_pass2: "Passwort bestätigen", auth_name: "Anzeigename",
    signin_btn: "Anmelden", signup_btn: "Konto erstellen", guest_link: "Als Gast fortfahren",
    verify_title: "Prüfe dein Postfach", pin_enter_title: "Profil-PIN eingeben", cancel: "Abbrechen",
    settings_title: "Einstellungen", sec_playback: "Wiedergabe", sec_language: "Sprache", sec_privacy: "Datenschutz & Sicherheit",
    set_autoplay_label: "Nächste Folge automatisch abspielen", set_autoplay_desc: "Wenn eine Folge endet, startet die nächste automatisch.",
    set_lang_desc: "Sprache der Oberfläche und der Beschreibungen.",
    privacy_pin_desc: "Eine 4-stellige PIN zum Öffnen dieses Profils erforderlich.",
    pin_new: "Neue PIN (4 Ziffern)", pin_confirm: "PIN bestätigen", pin_current: "Aktuelle PIN", pin_save: "Speichern",
    pin_enable: "PIN aktivieren", pin_change: "PIN ändern", pin_disable: "PIN deaktivieren", pin_enabled_on: "PIN-Schutz ist für dieses Profil AKTIV.",
    pw_desc: "Aktualisiere das Passwort deines MTFlix-Kontos.", pw_current: "Aktuelles Passwort", pw_new: "Neues Passwort",
    pw_confirm: "Neues Passwort bestätigen", pw_update: "Passwort aktualisieren",
    profile_add_title: "Profil hinzufügen", profile_edit_title: "Profil bearbeiten",
    profile_name_ph: "Name", profile_save: "Speichern", profile_cancel: "Abbrechen", profile_delete: "Löschen",
    tab_colors: "Farben", tab_avatars: "Avatare", tab_custom: "Eigenes", btn_upload: "Bild auswählen", btn_random: "🎲 Zufällig",
    list_watchlist: "Meine Liste", list_tracking: "Verfolgung",
    hdr_trailer: "Trailer ansehen", hdr_play: "Abspielen", hdr_resume: "Fortsetzen",
    mylist_add: "Zur Meine Liste hinzufügen", mylist_in: "In Meine Liste ✓",
    st_plan: "Geplant", st_watching: "Am Schauen", st_completed: "Abgeschlossen", st_hold: "Pausiert", st_dropped: "Abgebrochen",
    row_trending: "Im Trend", row_popmovies: "Beliebte Filme", row_toprated: "Beste aller Zeiten",
    row_poptv: "Serien zum Binge-Watchen", row_action: "Action & Abenteuer", row_scifi: "Sci-Fi-Welten",
    row_horror: "Licht aus — Horror", row_comedy: "Comedys zum Entspannen", row_animation: "Animation für alle",
    row_romance: "Romantischer Abend", row_airing: "Diese Woche neu", row_continue: "Weiterschauen",
  },
  pt: {
    nav_home: "Início", nav_movies: "Filmes", nav_tv: "Séries", nav_list: "Minha Lista",
    search_ph: "Títulos, pessoas, gêneros",
    gate_title: "Quem está assistindo?", gate_manage: "Gerenciar perfis",
    menu_settings: "Configurações", menu_manage: "Gerenciar perfis", menu_switch: "Trocar perfil", menu_signout: "Sair",
    auth_in: "Entrar", auth_up: "Cadastrar", auth_email: "E-mail", auth_pass: "Senha",
    auth_pass_min: "Senha (mínimo 6 caracteres)", auth_pass2: "Confirmar senha", auth_name: "Nome de exibição",
    signin_btn: "Entrar", signup_btn: "Criar conta", guest_link: "Continuar como convidado",
    verify_title: "Verifique seu e-mail", pin_enter_title: "Digite o PIN do perfil", cancel: "Cancelar",
    settings_title: "Configurações", sec_playback: "Reprodução", sec_language: "Idioma", sec_privacy: "Privacidade e segurança",
    set_autoplay_label: "Reproduzir próximo episódio automaticamente", set_autoplay_desc: "Quando um episódio termina, o próximo começa automaticamente.",
    set_lang_desc: "Idioma da interface e das descrições.",
    privacy_pin_desc: "Exigir um PIN de 4 dígitos para abrir este perfil.",
    pin_new: "Novo PIN (4 dígitos)", pin_confirm: "Confirmar PIN", pin_current: "PIN atual", pin_save: "Salvar",
    pin_enable: "Ativar PIN", pin_change: "Alterar PIN", pin_disable: "Desativar PIN", pin_enabled_on: "A proteção por PIN está ATIVA neste perfil.",
    pw_desc: "Atualize a senha da sua conta MTFlix.", pw_current: "Senha atual", pw_new: "Nova senha",
    pw_confirm: "Confirmar nova senha", pw_update: "Atualizar senha",
    profile_add_title: "Adicionar um perfil", profile_edit_title: "Editar perfil",
    profile_name_ph: "Nome", profile_save: "Salvar", profile_cancel: "Cancelar", profile_delete: "Excluir",
    tab_colors: "Cores", tab_avatars: "Avatares", tab_custom: "Personalizado", btn_upload: "Escolher imagem", btn_random: "🎲 Aleatório",
    list_watchlist: "Minha Lista", list_tracking: "Acompanhamento",
    hdr_trailer: "Assistir trailer", hdr_play: "Reproduzir", hdr_resume: "Retomar",
    mylist_add: "Adicionar à Minha Lista", mylist_in: "Na Minha Lista ✓",
    st_plan: "Planejo ver", st_watching: "Assistindo", st_completed: "Concluído", st_hold: "Em pausa", st_dropped: "Abandonado",
    row_trending: "Em alta", row_popmovies: "Filmes populares", row_toprated: "Melhores de todos os tempos",
    row_poptv: "Séries para maratonar", row_action: "Ação e aventura", row_scifi: "Mundos de ficção científica",
    row_horror: "Luzes apagadas — Terror", row_comedy: "Comédias para relaxar", row_animation: "Animação para todos",
    row_romance: "Noite romântica", row_airing: "No ar esta semana", row_continue: "Continuar assistindo",
  },
  tr: {
    nav_home: "Ana Sayfa", nav_movies: "Filmler", nav_tv: "Diziler", nav_list: "Listem",
    search_ph: "Başlık, kişi, tür",
    gate_title: "Kim izliyor?", gate_manage: "Profilleri Yönet",
    menu_settings: "Ayarlar", menu_manage: "Profilleri Yönet", menu_switch: "Profil Değiştir", menu_signout: "Çıkış Yap",
    auth_in: "Giriş Yap", auth_up: "Kayıt Ol", auth_email: "E-posta", auth_pass: "Şifre",
    auth_pass_min: "Şifre (en az 6 karakter)", auth_pass2: "Şifreyi Onayla", auth_name: "Görünen ad",
    signin_btn: "Giriş Yap", signup_btn: "Hesap Oluştur", guest_link: "Misafir olarak devam et",
    verify_title: "E-postanı kontrol et", pin_enter_title: "Profil PIN kodunu gir", cancel: "İptal",
    settings_title: "Ayarlar", sec_playback: "Oynatma", sec_language: "Dil", sec_privacy: "Gizlilik ve Güvenlik",
    set_autoplay_label: "Sonraki bölümü otomatik oynat", set_autoplay_desc: "Bir bölüm bittiğinde sonraki otomatik olarak başlar.",
    set_lang_desc: "Arayüz ve film açıklamaları dili.",
    privacy_pin_desc: "Bu profili açmak için 4 haneli PIN gerekli.",
    pin_new: "Yeni PIN (4 hane)", pin_confirm: "PIN'i onayla", pin_current: "Mevcut PIN", pin_save: "Kaydet",
    pin_enable: "PIN'i etkinleştir", pin_change: "PIN'i değiştir", pin_disable: "PIN'i kapat", pin_enabled_on: "Bu profil için PIN koruması AÇIK.",
    pw_desc: "MTFlix hesabının şifresini güncelle.", pw_current: "Mevcut şifre", pw_new: "Yeni şifre",
    pw_confirm: "Yeni şifreyi onayla", pw_update: "Şifreyi güncelle",
    profile_add_title: "Profil ekle", profile_edit_title: "Profili düzenle",
    profile_name_ph: "İsim", profile_save: "Kaydet", profile_cancel: "İptal", profile_delete: "Sil",
    tab_colors: "Renkler", tab_avatars: "Avatarlar", tab_custom: "Özel", btn_upload: "Resim seç", btn_random: "🎲 Rastgele",
    list_watchlist: "Listem", list_tracking: "Takip",
    hdr_trailer: "Fragmanı izle", hdr_play: "Oynat", hdr_resume: "Devam Et",
    mylist_add: "Listeme Ekle", mylist_in: "Listemde ✓",
    st_plan: "İzleyecek", st_watching: "İzliyor", st_completed: "Tamamladı", st_hold: "Bekletiyor", st_dropped: "Bıraktı",
    row_trending: "Popüler", row_popmovies: "Popüler Filmler", row_toprated: "Tüm Zamanların En İyileri",
    row_poptv: "Kaçırılmayacak Diziler", row_action: "Aksiyon ve Macera", row_scifi: "Bilim Kurgu Dünyaları",
    row_horror: "Işıkları Kapat — Korku", row_comedy: "Keyifli Komediler", row_animation: "Herkese Animasyon",
    row_romance: "Romantik Gece", row_airing: "Bu Hafta Yayında", row_continue: "İzlemeye Devam Et",
  },
};

const LANGS = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "pt", label: "Português" },
  { id: "tr", label: "Türkçe" },
];

function activeProfile() {
  return getProfiles().find((p) => p.id === localStorage.getItem(LS_SESSION));
}

function lang() {
  return activeProfile()?.lang || "en";
}

function t(key) {
  const table = I18N[lang()] || I18N.en;
  return table[key] ?? I18N.en[key] ?? key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function diceUrl(style, seed) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed || "x")}`;
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function isDiceAvatar(p) {
  return Boolean(p?.avatar && p.avatar.type === "dice");
}

function hasImageAvatar(p) {
  return Boolean(p?.avatar && (p.avatar.type === "dice" || p.avatar.type === "custom"));
}

function avatarBackground(p) {
  if (!p?.avatar) return null;
  if (p.avatar.type === "dice") return `url("${diceUrl(p.avatar.style, p.avatar.seed)}") center / cover no-repeat`;
  if (p.avatar.type === "custom") return `url("${p.avatar.data}") center / cover no-repeat`;
  return null;
}

function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("not-image"));
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / image.width, size / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.onerror = () => reject(new Error("bad-image"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("read-error"));
    reader.readAsDataURL(file);
  });
}

function renderAvatarInto(el, p) {
  if (!el || !p) return;
  const bg = avatarBackground(p);
  if (bg) {
    el.textContent = "";
    el.style.background = bg;
  } else {
    el.textContent = (p.name[0] || "?").toUpperCase();
    el.style.background = AVATAR_GRADIENTS[(p.g ?? 0) % AVATAR_GRADIENTS.length];
  }
}

let apiKey =
  TMDB_API_KEY && TMDB_API_KEY !== "YOUR_TMDB_API_KEY"
    ? TMDB_API_KEY
    : localStorage.getItem(LS_KEY) || "";

let genreMaps = { movie: {}, tv: {} };
let heroItems = [];
let heroIndex = 0;
let heroTimer = null;
let searchTimer = null;

const ROWS = [
  { id: "trending", titleKey: "row_trending", path: "/trending/all/day" },
  { id: "popular-movies", titleKey: "row_popmovies", path: "/movie/popular" },
  { id: "top-rated", titleKey: "row_toprated", path: "/movie/top_rated" },
  { id: "popular-tv", titleKey: "row_poptv", path: "/tv/popular" },
  { id: "action", titleKey: "row_action", path: "/discover/movie", params: { with_genres: 28, sort_by: "popularity.desc" } },
  { id: "scifi", titleKey: "row_scifi", path: "/discover/movie", params: { with_genres: 878, sort_by: "popularity.desc" } },
  { id: "horror", titleKey: "row_horror", path: "/discover/movie", params: { with_genres: 27, sort_by: "popularity.desc" } },
  { id: "comedy", titleKey: "row_comedy", path: "/discover/movie", params: { with_genres: 35, sort_by: "popularity.desc" } },
  { id: "animation", titleKey: "row_animation", path: "/discover/movie", params: { with_genres: 16, sort_by: "popularity.desc" } },
  { id: "romance", titleKey: "row_romance", path: "/discover/movie", params: { with_genres: 10749, sort_by: "popularity.desc" } },
  { id: "airing", titleKey: "row_airing", path: "/tv/airing_today" },
];

const $ = (sel) => document.querySelector(sel);

function placeholderImage(label) {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'><rect width='100%' height='100%' fill='%231e1e2b'/><text x='50%25' y='50%25' fill='%23555a6a' font-family='sans-serif' font-size='20' text-anchor='middle' dominant-baseline='middle'>" +
    (label || "No Image") +
    "</text></svg>";
  return "data:image/svg+xml," + svg;
}

function img(path, size) {
  return path ? IMG_BASE + size + path : placeholderImage("No Image");
}

const LANG_REGION = { en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", tr: "tr-TR" };

async function tmdb(path, params = {}) {
  const url = new URL(API_BASE + path);
  url.searchParams.set("api_key", apiKey);
  if (!params.language) params.language = LANG_REGION[lang()] || "en-US";
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error("INVALID_KEY");
    throw new Error(`TMDB request failed (${res.status})`);
  }
  return res.json();
}

function normalizeItem(r, forcedType) {
  return {
    id: r.id,
    media_type: r.media_type || forcedType || "movie",
    title: r.title || r.name || "Untitled",
    poster_path: r.poster_path,
    backdrop_path: r.backdrop_path,
    vote_average: r.vote_average || 0,
    date: r.release_date || r.first_air_date || "",
    overview: r.overview || "",
  };
}

async function loadGenres() {
  try {
    const [m, t] = await Promise.all([tmdb("/genre/movie/list"), tmdb("/genre/tv/list")]);
    m.genres.forEach((g) => (genreMaps.movie[g.id] = g.name));
    t.genres.forEach((g) => (genreMaps.tv[g.id] = g.name));
  } catch (_) {}
}

function year(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : "";
}

function rating(v) {
  return v ? v.toFixed(1) : "—";
}

function bookmarkSvg() {
  return '<svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>';
}

function cardHTML(item) {
  const active = inList(item.id) ? " active" : "";
  return `
    <article class="card" data-type="${item.media_type}" data-id="${item.id}">
      <img class="card-poster" loading="lazy" src="${img(item.poster_path, "w500")}" alt="${escapeHtml(item.title)}" onerror="this.onerror=null;this.src=placeholderImage()">
      ${item.progressPct ? `<div class="card-progress"><span style="width:${item.progressPct}%"></span></div>` : ""}
      <button class="bookmark-btn${active}" title="Add to My List" aria-label="Toggle watchlist">${bookmarkSvg()}</button>
      <div class="card-info">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-sub">
          <span class="card-rating">★ ${rating(item.vote_average)}</span>
          <span>${year(item.date)}</span>
        </div>
      </div>
    </article>`;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : str;
  return d.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function skeletonRow(count = 8) {
  return Array.from({ length: count }, () => '<div class="skeleton-card"></div>').join("");
}

function buildRowSection(rowDef) {
  const section = document.createElement("section");
  section.className = "row-section";
  section.dataset.rowId = rowDef.id;
  section.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">${escapeHtml(t(rowDef.titleKey))}</h2>
    </div>
    <div class="row-body">
      <button class="row-nav prev" aria-label="Scroll left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
      <div class="row-scroller">${skeletonRow()}</div>
      <button class="row-nav next" aria-label="Scroll right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></button>
    </div>`;
  return section;
}

function fillRow(section, items) {
  const scroller = section.querySelector(".row-scroller");
  scroller.innerHTML = items.map(cardHTML).join("");
  const header = section.querySelector(".row-header");
  let countEl = header.querySelector(".row-count");
  if (!countEl) {
    countEl = document.createElement("span");
    countEl.className = "row-count";
    header.appendChild(countEl);
  }
  countEl.textContent = `${items.length} titles`;
}

function wireRowArrows(section) {
  const scroller = section.querySelector(".row-scroller");
  section.querySelectorAll(".row-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.classList.contains("next") ? 1 : -1;
      scroller.scrollBy({ left: dir * scroller.clientWidth * 0.85, behavior: "smooth" });
    });
  });
}

async function renderRows(filter) {
  const container = $("#rows");
  container.innerHTML = "";

  if (filter === "home") {
    const continueWatching = continueItems();
    if (continueWatching.length) {
      const cwSection = buildRowSection({ id: "continue", titleKey: "row_continue" });
      container.appendChild(cwSection);
      wireRowArrows(cwSection);
      fillRow(cwSection, continueWatching);
    }
  }

  const defs = ROWS.filter((r) => {
    if (filter === "home") return true;
    if (filter === "movie") return r.path.includes("/movie/") || r.path.includes("/discover/");
    if (filter === "tv") return r.path.includes("/tv/");
    return true;
  });

  if (filter === "list") {
    renderMyListView(container);
    return;
  }

  for (const def of defs) {
    const section = buildRowSection(def);
    container.appendChild(section);
    wireRowArrows(section);
    try {
      const data = await tmdb(def.path, { language: "en-US", ...def.params });
      const items = data.results
        .map((r) => normalizeItem(r))
        .filter((i) => i.poster_path)
        .slice(0, 18);
      fillRow(section, items);
    } catch (err) {
      handleFetchError(err, section);
    }
  }
}

function renderMyListView(container) {
  const section = document.createElement("section");
  section.className = "search-results";
  section.style.padding = "140px 4% 60px";
  section.innerHTML = `
    <h2 class="results-title">${listTab === "list" ? t("list_watchlist") : t("list_tracking")}</h2>
    <div class="view-tabs">
      <button data-tab="list" class="${listTab === "list" ? "active" : ""}" type="button">${t("list_watchlist")}</button>
      <button data-tab="tracking" class="${listTab === "tracking" ? "active" : ""}" type="button">${t("list_tracking")}</button>
    </div>
    <div id="tab-content"></div>`;
  container.appendChild(section);
  section.querySelectorAll(".view-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      listTab = b.dataset.tab;
      renderRows("list");
    })
  );
  const content = section.querySelector("#tab-content");
  if (listTab === "tracking") renderTrackingTab(content);
  else renderWatchlistTab(content);
}

function renderWatchlistTab(content) {
  const list = getList();
  if (!list.length) {
    content.innerHTML = `
      <div class="empty-state">
        <h2>Your list is empty</h2>
        <p>Hover any poster and hit the bookmark icon to save it here.</p>
      </div>`;
    return;
  }
  content.innerHTML = `<p class="results-sub">${list.length} saved titles</p><div class="results-grid"></div>`;
  content.querySelector(".results-grid").innerHTML = list.map(cardHTML).join("");
}

function renderTrackingTab(content) {
  const entries = Object.entries(getTrackStore()).filter(([, t]) => t.title && t.poster_path);
  if (!entries.length) {
    content.innerHTML = `
      <div class="empty-state">
        <h2>Nothing tracked yet</h2>
        <p>Open any movie or show, then set a status and rating to track it here.</p>
      </div>`;
    return;
  }
  let html = "";
  TRACK_STATUSES.forEach((s) => {
    const items = entries.filter(([, t]) => t.status === s.id);
    if (!items.length) return;
    html += `<div class="tracking-section"><h3>${t(`st_${s.id}`)}<span class="count-chip">${items.length}</span></h3><div class="results-grid">${items
      .map(([id, t]) => trackCardHTML(id, t))
      .join("")}</div></div>`;
  });
  const ratedOnly = entries.filter(([, t]) => !t.status && t.rating);
  if (ratedOnly.length) {
    html += `<div class="tracking-section"><h3>Rated<span class="count-chip">${ratedOnly.length}</span></h3><div class="results-grid">${ratedOnly
      .map(([id, t]) => trackCardHTML(id, t))
      .join("")}</div></div>`;
  }
  content.innerHTML = html;
}

function trackCardHTML(id, item) {
  const w = getWatch(id);
  const pct = w.d ? Math.min(100, Math.round((w.t / w.d) * 100)) : 0;
  return `
    <article class="card" data-type="${item.media_type || "movie"}" data-id="${id}">
      <img class="card-poster" loading="lazy" src="${img(item.poster_path, "w500")}" alt="${escapeHtml(item.title)}" onerror="this.onerror=null;this.src=placeholderImage()">
      <span class="card-status-badge badge-${item.status}">${item.status ? t(`st_${item.status}`) : "★"}</span>
      ${item.rating ? `<span class="card-track-meta">${"★".repeat(item.rating)}</span>` : ""}
      ${pct ? `<div class="card-progress"><span style="width:${pct}%"></span></div>` : ""}
      <div class="card-info">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-sub">
          <span class="card-rating">★ ${rating(item.vote_average || 0)}</span>
          <span>${year(item.date || "")}</span>
        </div>
      </div>
    </article>`;
}

function handleFetchError(err, scope) {
  if (scope) scope.querySelectorAll(".skeleton-card").forEach((s) => s.remove());
  if (err.message === "INVALID_KEY") {
    localStorage.removeItem(LS_KEY);
    showSetup(true);
  }
}

async function startApp() {
  await loadGenres();
  await Promise.all([buildHero(), renderRows(currentFilter)]);
  appStarted = true;
}

let currentFilter = "home";

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".nav-links a").forEach((a) =>
    a.classList.toggle("active", a.dataset.filter === filter)
  );
  $("#hero").classList.toggle("hidden", filter === "list");
  renderRows(filter);
}

async function buildHero() {
  const hero = $("#hero");
  try {
    const data = await tmdb("/trending/all/day");
    heroItems = data.results
      .filter((r) => r.backdrop_path && (r.title || r.name))
      .map((r) => normalizeItem(r))
      .slice(0, 6);
    if (!heroItems.length) return;

    hero.innerHTML = `
      <div class="hero-backdrop" id="hero-backdrop"></div>
      <div class="hero-content">
        <div class="hero-meta">
          <span class="hero-type-badge" id="hero-type">MOVIE</span>
          <span class="hero-rating" id="hero-rating"></span>
          <span class="muted" id="hero-year"></span>
        </div>
        <h1 class="hero-title" id="hero-title"></h1>
        <p class="hero-overview" id="hero-overview"></p>
        <div class="hero-buttons">
          <button class="btn btn-accent" id="hero-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Play</button>
          <button class="btn btn-ghost" id="hero-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>More Info</button>
        </div>
      </div>
      <div class="hero-dots" id="hero-dots"></div>`;

    const dots = $("#hero-dots");
    heroItems.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "hero-dot" + (i === 0 ? " active" : "");
      dot.addEventListener("click", () => setHeroSlide(i));
      dots.appendChild(dot);
    });

    setHeroSlide(0);
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      setHeroSlide((heroIndex + 1) % heroItems.length);
    }, 8000);

    $("#hero-play").addEventListener("click", () => {
      openDetail(heroItems[heroIndex].media_type, heroItems[heroIndex].id, true);
    });
    $("#hero-info").addEventListener("click", () => {
      openDetail(heroItems[heroIndex].media_type, heroItems[heroIndex].id, false);
    });
  } catch (err) {
    handleFetchError(err);
  }
}

function setHeroSlide(i) {
  heroIndex = i;
  const item = heroItems[i];
  const backdrop = $("#hero-backdrop");
  backdrop.classList.remove("visible");
  setTimeout(() => {
    backdrop.style.backgroundImage = `url(${IMG_BASE}original${item.backdrop_path})`;
    backdrop.classList.add("visible");
  }, 120);
  $("#hero-type").textContent = item.media_type === "tv" ? "SERIES" : "FILM";
  $("#hero-rating").textContent = `★ ${rating(item.vote_average)}`;
  $("#hero-year").textContent = year(item.date);
  $("#hero-title").textContent = item.title;
  $("#hero-overview").textContent = item.overview;
  document.querySelectorAll(".hero-dot").forEach((d, di) =>
    d.classList.toggle("active", di === i)
  );
}

function hasPlayer() {
  return Boolean(PLAYER_SERVER.movie && PLAYER_SERVER.tv);
}

function buildPlayerUrl(type, id, season, episode, resumeSeconds) {
  const base =
    type === "tv"
      ? PLAYER_SERVER.tv.replace("{id}", id).replace("{season}", season || 1).replace("{episode}", episode || 1)
      : PLAYER_SERVER.movie.replace("{id}", id);
  const params = new URLSearchParams({ color: PLAYER_SERVER.color, autoPlay: "true" });
  if (type === "tv" && activeProfile()?.autoplay !== false) {
    params.set("nextEpisode", "true");
    params.set("episodeSelector", "true");
  }
  if (resumeSeconds > 30) {
    params.set("progress", String(Math.floor(resumeSeconds)));
  }
  return `${base}?${params.toString()}`;
}

function getWatchStore() {
  try {
    return JSON.parse(localStorage.getItem(pKey(LS_PROGRESS))) || {};
  } catch {
    return {};
  }
}

function getWatch(id) {
  return getWatchStore()[String(id)] || { t: 0, d: 0 };
}

function fmtTime(total) {
  total = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function continueItems() {
  return Object.entries(getWatchStore())
    .filter(([, w]) => w.t > 30 && w.title && w.poster_path)
    .map(([id, w]) => ({
      id: Number(id),
      media_type: w.media_type || "movie",
      title: w.title,
      poster_path: w.poster_path,
      backdrop_path: w.backdrop_path,
      vote_average: 0,
      date: "",
      overview: "",
      progressPct: w.d ? Math.min(100, Math.round((w.t / w.d) * 100)) : 0,
    }));
}

async function openDetail(type, id, autoplayTrailer) {
  closeModal();
  let data;
  try {
    data = await tmdb(`/${type}/${id}`, {
      language: "en-US",
      append_to_response: "credits,videos,similar",
    });
  } catch (err) {
    handleFetchError(err);
    return;
  }

  const title = data.title || data.name || "Untitled";
  currentPlayer = { type, id, title, poster_path: data.poster_path, backdrop_path: data.backdrop_path };
  const tagline = data.tagline || "";
  const date = data.release_date || data.first_air_date || "";
  const runtime = data.runtime
    ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
    : data.episode_run_time && data.episode_run_time.length
    ? `${data.episode_run_time[0]}m per ep`
    : "";
  const seasons = data.number_of_seasons ? `${data.number_of_seasons} season${data.number_of_seasons > 1 ? "s" : ""}` : "";
  const genres = (data.genres || []).map((g) => `<span class="genre-pill">${g.name}</span>`).join("");
  const cast = (data.credits?.cast || []).slice(0, 6);
  const similar = (data.similar?.results || [])
    .filter((s) => s.poster_path)
    .slice(0, 12)
    .map((s) => normalizeItem(s, type));

  const trailer =
    (data.videos?.results || []).find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official
    ) ||
    (data.videos?.results || []).find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    (data.videos?.results || []).find((v) => v.site === "YouTube");

  const inMyList = inList(data.id);
  const watch = getWatch(data.id);
  const trackNow = getTrack(data.id);
  const canStream = hasPlayer();
  const seasonsForPicker =
    type === "tv" ? (data.seasons || []).filter((s) => s.season_number > 0 && s.episode_count > 0) : [];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-hero" style="background-image:url(${img(data.backdrop_path, "w1280")})" id="modal-hero">
        <button class="modal-close" id="modal-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-title-row">
          <div>
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            ${tagline ? `<p class="modal-tagline">“${escapeHtml(tagline)}”</p>` : ""}
            <div class="modal-facts">
              <span class="match">${Math.round((data.vote_average || 0) * 10)}% Match</span>
              <span class="fact-rating">★ ${rating(data.vote_average)}</span>
              ${date ? `<span>${year(date)}</span>` : ""}
              ${runtime ? `<span>${runtime}</span>` : ""}
              ${seasons ? `<span>${seasons}</span>` : ""}
              <span class="fact-border">HD</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          ${
            canStream
              ? `<button class="btn btn-accent" id="play-now"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>${watch.t > 30 ? t("hdr_resume") : t("hdr_play")}</button>`
              : ""
          }
          ${
            canStream && seasonsForPicker.length
              ? `<div class="ep-picker"><select id="season-select">${seasonsForPicker
                  .map((s) => `<option value="${s.season_number}">${escapeHtml(s.name)}</option>`)
                  .join("")}</select><select id="episode-select"></select></div>`
              : ""
          }
          ${
            trailer
              ? `<button class="btn btn-${canStream ? "ghost" : "accent"}" id="play-trailer"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>${t("hdr_trailer")}</button>`
              : ""
          }
          <button class="btn btn-ghost ${inMyList ? "in-list" : ""}" id="modal-list-btn" data-id="${data.id}">
            <svg viewBox="0 0 24 24" fill="${inMyList ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
            ${inMyList ? t("mylist_in") : t("mylist_add")}
          </button>
        </div>
        <div class="track-row">
          <div class="track-pills" id="track-pills">
            ${TRACK_STATUSES.map(
              (s) =>
                `<button class="track-pill${trackNow.status === s.id ? " active" : ""}" data-status="${s.id}" type="button">${t(`st_${s.id}`)}</button>`
            ).join("")}
          </div>
          <div class="star-rating" id="star-rating">
            ${[1, 2, 3, 4, 5]
              .map(
                (i) =>
                  `<button class="star${i <= (trackNow.rating || 0) ? " filled" : ""}" data-v="${i}" type="button" title="${i} star${i > 1 ? "s" : ""}">★</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="genre-pills">${genres}</div>
        <h3 class="modal-section-title">Overview</h3>
        <p style="color:#cfd2da;line-height:1.65;font-size:.95rem;">${escapeHtml(data.overview || "No overview available.")}</p>
        ${
          cast.length
            ? `<h3 class="modal-section-title">Cast</h3><div class="cast-list">${cast
                .map(
                  (c) => `
                <div class="cast-item">
                  <img class="cast-photo" loading="lazy" src="${img(c.profile_path, "w185")}" alt="${escapeHtml(c.name)}" onerror="this.onerror=null;this.src=placeholderImage('No Photo');this.style.objectFit='contain';this.style.padding='22px'">
                  <div class="cast-name">${escapeHtml(c.name)}</div>
                  <div class="cast-role">${escapeHtml(c.character || "")}</div>
                </div>`
                )
                .join("")}</div>`
            : ""
        }
        ${
          similar.length
            ? `<h3 class="modal-section-title">More Like This</h3><div class="similar-grid">${similar.map(cardHTML).join("")}</div>`
            : ""
        }
      </div>
    </div>`;

  $("#modal-root").appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  $("#modal-close").addEventListener("click", closeModal);

  const populateEpisodes = () => {
    const seasonSel = $("#season-select");
    const episodeSel = $("#episode-select");
    if (!seasonSel || !episodeSel) return;
    const seasonData = (data.seasons || []).find((s) => s.season_number === Number(seasonSel.value));
    const count = seasonData?.episode_count || 1;
    episodeSel.innerHTML = Array.from(
      { length: count },
      (_, i) => `<option value="${i + 1}">Episode ${i + 1}</option>`
    ).join("");
  };
  populateEpisodes();
  $("#season-select")?.addEventListener("change", populateEpisodes);

  const playNow = () => {
    const heroArea = $("#modal-hero");
    if (!heroArea) return;
    const url = buildPlayerUrl(
      type,
      data.id,
      $("#season-select")?.value,
      $("#episode-select")?.value,
      watch.t
    );
    heroArea.querySelector(".modal-trailer")?.remove();
    const wrap = document.createElement("div");
    wrap.className = "modal-trailer";
    wrap.innerHTML = `<iframe src="${url}" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    heroArea.appendChild(wrap);
  };

  $("#play-now")?.addEventListener("click", playNow);

  const trailerBtn = $("#play-trailer");
  if (trailerBtn) {
    trailerBtn.addEventListener("click", () => playTrailer(trailer.key));
  }

  if (autoplayTrailer) {
    if (canStream) playNow();
    else if (trailer) playTrailer(trailer.key);
  }

  $("#modal-list-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleList(normalizeItem({ ...data, media_type: type }));
    syncModalListButton(data.id);
  });

  const refreshTrackUI = () => {
    const t = getTrack(data.id);
    document.querySelectorAll("#track-pills .track-pill").forEach((b) =>
      b.classList.toggle("active", b.dataset.status === t.status)
    );
    document.querySelectorAll("#star-rating .star").forEach((b) =>
      b.classList.toggle("filled", Number(b.dataset.v) <= (t.rating || 0))
    );
  };
  document.querySelectorAll("#track-pills .track-pill").forEach((b) =>
    b.addEventListener("click", () => {
      const next = getTrack(data.id).status === b.dataset.status ? "" : b.dataset.status;
      setTrackEntry(data.id, { status: next }, { title, poster_path: data.poster_path, media_type: type });
      showToast(next ? `${t(`st_${next}`)} — “${title}”` : `“${title}” ✓`);
      refreshTrackUI();
    })
  );
  document.querySelectorAll("#star-rating .star").forEach((b) =>
    b.addEventListener("click", () => {
      const v = Number(b.dataset.v);
      const cur = getTrack(data.id).rating || 0;
      setTrackEntry(data.id, { rating: cur === v ? 0 : v }, { title, poster_path: data.poster_path, media_type: type });
      refreshTrackUI();
    })
  );
}

function playTrailer(key) {
  const heroArea = $("#modal-hero");
  if (!heroArea) return;
  heroArea.querySelector(".modal-trailer")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "modal-trailer";
  wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  heroArea.appendChild(wrap);
}

function syncModalListButton(id) {
  const btn = $("#modal-list-btn");
  if (!btn) return;
  const active = inList(id);
  btn.classList.toggle("in-list", active);
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${active ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
    ${active ? t("mylist_in") : t("mylist_add")}`;
}

function closeModal() {
  $("#modal-overlay")?.remove();
}

function pKey(key) {
  return `${key}_${localStorage.getItem(LS_SESSION) || "guest"}`;
}

function profilesKey() {
  const uid = getAuthUserId();
  return LS_PROFILES + (uid && uid !== "guest" ? "_" + uid : "");
}

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(profilesKey())) || [];
  } catch {
    return [];
  }
}

function saveProfiles(list) {
  localStorage.setItem(profilesKey(), JSON.stringify(list));
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function getAuthUserId() {
  return localStorage.getItem(LS_AUTH) || "";
}

function randomSalt() {
  if (window.crypto && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function hashPassword(password, salt) {
  if (window.crypto && crypto.subtle) {
    const data = new TextEncoder().encode(salt + password);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 5381;
  const str = salt + password;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return "f" + h.toString(16);
}

function initAuth() {
  const uid = getAuthUserId();
  if (uid && (uid === "guest" || getUsers().some((u) => u.id === uid))) {
    initProfiles();
  } else {
    showAuthScreen("signin");
  }
}

function wireAuth() {
  $("#tab-signin").addEventListener("click", () => switchAuthTab("signin"));
  $("#tab-signup").addEventListener("click", () => switchAuthTab("signup"));
  $("#form-signin").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSignIn();
  });
  $("#form-signup").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSignUp();
  });
  $("#guest-btn").addEventListener("click", continueAsGuest);
  $("#form-verify").addEventListener("submit", (e) => {
    e.preventDefault();
    handleVerify();
  });
  $("#resend-btn").addEventListener("click", resendCode);
  $("#verify-back").addEventListener("click", verifyBack);
}

function switchAuthTab(tab) {
  $("#tab-signin").classList.toggle("active", tab === "signin");
  $("#tab-signup").classList.toggle("active", tab === "signup");
  $("#form-signin").classList.toggle("hidden", tab !== "signin");
  $("#form-signup").classList.toggle("hidden", tab !== "signup");
  $("#form-verify").classList.add("hidden");
  authError("signin", "");
  authError("signup", "");
}

function showAuthScreen(tab) {
  $("#auth-screen").classList.remove("hidden");
  switchAuthTab(tab || "signin");
}

function authError(form, msg) {
  const el = $(`#${form}-error`);
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

async function handleSignIn() {
  const email = $("#signin-email").value.trim().toLowerCase();
  const pass = $("#signin-pass").value;
  const user = getUsers().find((u) => u.email === email);
  if (!user) {
    authError("signin", "No account found with that email.");
    return;
  }
  const hash = await hashPassword(pass, user.salt);
  if (hash !== user.passHash) {
    authError("signin", "Incorrect password. Try again.");
    return;
  }
  if (localStorage.getItem(`cineverse_trusted_${user.id}`) === "1") {
    localStorage.setItem(LS_AUTH, user.id);
    enterAfterAuth(user);
    return;
  }
  pendingVerification = {
    mode: "signin",
    user,
    code: generateCode(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  showVerifyScreen();
}

async function handleSignUp() {
  const name = $("#signup-name").value.trim();
  const email = $("#signup-email").value.trim().toLowerCase();
  const pass = $("#signup-pass").value;
  const confirm = $("#signup-confirm").value;
  if (!name) return authError("signup", "Please enter a display name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authError("signup", "Please enter a valid email address.");
  if (pass.length < 6) return authError("signup", "Password must be at least 6 characters.");
  if (pass !== confirm) return authError("signup", "Passwords do not match.");
  const users = getUsers();
  if (users.some((u) => u.email === email)) return authError("signup", "An account with that email already exists.");

  const salt = randomSalt();
  const draftUser = {
    id: "u_" + Date.now().toString(36),
    name,
    email,
    salt,
    passHash: await hashPassword(pass, salt),
    createdAt: Date.now(),
  };
  pendingVerification = {
    mode: "signup",
    draft: draftUser,
    code: generateCode(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  showVerifyScreen();
}

function continueAsGuest() {
  localStorage.setItem(LS_AUTH, "guest");
  enterAfterAuth({ id: "guest", name: "Guest", email: "" });
}

let pendingVerification = null;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name[0]}${"*".repeat(Math.max(3, name.length - 1))}@${domain}`;
}

function showVerifyScreen() {
  const pv = pendingVerification;
  if (!pv) return;
  $("#form-signin").classList.add("hidden");
  $("#form-signup").classList.add("hidden");
  $("#tab-signin").classList.remove("active");
  $("#tab-signup").classList.remove("active");
  $("#form-verify").classList.remove("hidden");

  const email = pv.mode === "signup" ? pv.draft.email : pv.user.email;
  $("#verify-sub").textContent =
    (pv.mode === "signup"
      ? "We sent a 6-digit code to activate your account. "
      : "New browser detected — we sent a security code to ")
    + maskEmail(email) + ".";
  renderDemoEmail(pv.code);
  buildCodeRow($("#code-row"), 6, () => $("#form-verify").requestSubmit(), false);
  $("#verify-back").textContent = pv.mode === "signup" ? "← " + t("auth_in") : t("cancel");
  authErrorVerify("");
}

function renderDemoEmail(code) {
  const minutes = Math.max(1, Math.round((pendingVerification.expiresAt - Date.now()) / 60000));
  $("#demo-email-body").innerHTML = `
    <p><strong>Hi${pendingVerification.mode === "signup" ? " and welcome" : ""}!</strong></p>
    <p>Your MTFlix verification code is:</p>
    <div class="code-big">${code}</div>
    <p>This code expires in ${minutes} minute${minutes > 1 ? "s" : ""}. If you didn't request it, you can ignore this email.</p>
    <p class="muted">— The MTFlix Team</p>`;
}

function collectCode() {
  return Array.from($("#code-row").children)
    .map((b) => b.value || "")
    .join("");
}

function clearCodeBoxes() {
  $("#code-row")
    .querySelectorAll(".code-box")
    .forEach((b) => (b.value = ""));
  $("#code-row").querySelector(".code-box")?.focus();
}

function authErrorVerify(msg) {
  const el = $("#verify-error");
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

async function handleVerify() {
  const pv = pendingVerification;
  if (!pv) return;
  if (Date.now() > pv.expiresAt) {
    authErrorVerify("This code has expired. Tap “Resend code” to get a new one.");
    clearCodeBoxes();
    return;
  }
  if (collectCode() !== pv.code) {
    authErrorVerify("Incorrect code. Please check and try again.");
    clearCodeBoxes();
    return;
  }
  pendingVerification = null;
  if (pv.mode === "signup") {
    const users = getUsers();
    users.push(pv.draft);
    saveUsers(users);
    localStorage.setItem(LS_AUTH, pv.draft.id);
    localStorage.setItem(`cineverse_trusted_${pv.draft.id}`, "1");
    enterAfterAuth(pv.draft);
  } else {
    localStorage.setItem(`cineverse_trusted_${pv.user.id}`, "1");
    localStorage.setItem(LS_AUTH, pv.user.id);
    enterAfterAuth(pv.user);
  }
}

function resendCode() {
  if (!pendingVerification) return;
  pendingVerification.code = generateCode();
  pendingVerification.expiresAt = Date.now() + 10 * 60 * 1000;
  renderDemoEmail(pendingVerification.code);
  clearCodeBoxes();
  authErrorVerify("");
}

function verifyBack() {
  pendingVerification = null;
  switchAuthTab("signin");
}

function signOut() {
  localStorage.removeItem(LS_AUTH);
  location.reload();
}

function enterAfterAuth(user) {
  $("#auth-screen").classList.add("hidden");
  applyUserChrome(user);
  initProfiles();
}

function applyUserChrome(user) {
  const head = $("#menu-user-head");
  if (!head) return;
  head.innerHTML = `<strong>${escapeHtml(user.name)}</strong>${user.email ? `<span>${escapeHtml(user.email)}</span>` : "<span>Browsing as guest</span>"}`;
}

function wireAvatarMenu() {
  $("#nav-avatar").addEventListener("click", (e) => {
    e.stopPropagation();
    $("#avatar-menu").classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".avatar-wrap")) {
      $("#avatar-menu")?.classList.add("hidden");
    }
  });
  $("#menu-switch").addEventListener("click", () => openGate());
  $("#menu-signout").addEventListener("click", () => signOut());
  $("#menu-settings").addEventListener("click", () => {
    $("#avatar-menu").classList.add("hidden");
    openSettings("playback");
  });
  $("#menu-manage").addEventListener("click", () => {
    $("#avatar-menu").classList.add("hidden");
    gateEditing = true;
    renderGate(false);
  });
  $("#settings-close").addEventListener("click", closeSettings);
  document.querySelectorAll(".side-link").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".side-link").forEach((x) =>
        x.classList.toggle("active", x === b)
      );
      renderSettings(b.dataset.sec);
    })
  );
}

function openSettings(section) {
  $("#settings-screen").classList.remove("hidden");
  document.querySelectorAll(".side-link").forEach((b) =>
    b.classList.toggle("active", b.dataset.sec === section)
  );
  renderSettings(section);
}

function closeSettings() {
  $("#settings-screen").classList.add("hidden");
}

function renderSettings(section) {
  const content = $("#settings-content");
  if (section === "playback") renderPlaybackSettings(content);
  else if (section === "language") renderLanguageSettings(content);
  else if (section === "privacy") renderPrivacySettings(content);
}

function updateActiveProfile(patch) {
  const profiles = getProfiles();
  const profile = profiles.find((p) => p.id === localStorage.getItem(LS_SESSION));
  if (!profile) return null;
  Object.assign(profile, patch);
  saveProfiles(profiles);
  return profile;
}

function renderPlaybackSettings(content) {
  const profile = activeProfile();
  const on = profile?.autoplay !== false;
  content.innerHTML = `
    <h3 class="settings-h3">${t("sec_playback")}</h3>
    <div class="setting-row">
      <div>
        <div class="setting-name">${t("set_autoplay_label")}</div>
        <div class="setting-desc">${t("set_autoplay_desc")}</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="autoplay-toggle" ${on ? "checked" : ""} />
        <span class="slider"></span>
      </label>
    </div>`;
  $("#autoplay-toggle").addEventListener("change", (e) => {
    updateActiveProfile({ autoplay: e.target.checked });
    showToast(`${t("set_autoplay_label")}: ${e.target.checked ? "ON" : "OFF"}`);
  });
}

function renderLanguageSettings(content) {
  content.innerHTML = `
    <h3 class="settings-h3">${t("sec_language")}</h3>
    <p class="setting-desc" style="margin-bottom:18px;">${t("set_lang_desc")}</p>
    <div class="lang-list">
      ${LANGS.map(
        (l) =>
          `<button type="button" class="lang-option${l.id === lang() ? " active" : ""}" data-lang="${l.id}">${l.id === lang() ? "✓ " : ""}${l.label}</button>`
      ).join("")}
    </div>`;
  content.querySelectorAll(".lang-option").forEach((b) =>
    b.addEventListener("click", async () => {
      updateActiveProfile({ lang: b.dataset.lang });
      applyI18n();
      if (appStarted && apiKey) await startApp();
      openSettings("language");
    })
  );
}

function renderPrivacySettings(content) {
  const profile = activeProfile();
  const user = getUsers().find((u) => u.id === getAuthUserId());
  const pinHtml = `
    <div class="privacy-card">
      <div class="privacy-head">🔒 ${t("pin_enter_title")}</div>
      <p class="setting-desc">${profile?.pinHash ? t("pin_enabled_on") : t("privacy_pin_desc")}</p>
      ${
        profile?.pinHash
          ? `
        <input id="pin-cur" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_current")}" />
        <input id="pin-new" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_new")}" />
        <input id="pin-confirm" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_confirm")}" />
        <div class="panel-actions">
          <button type="button" class="btn btn-ghost" id="pin-disable-btn">${t("pin_disable")}</button>
          <button type="button" class="btn btn-accent" id="pin-change-btn">${t("pin_change")}</button>
        </div>`
          : `
        <input id="pin-new" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_new")}" />
        <input id="pin-confirm" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_confirm")}" />
        <button type="button" class="btn btn-accent" id="pin-enable-btn">${t("pin_enable")}</button>`
      }
      <p class="auth-error hidden" id="pin-error-s"></p>
    </div>`;

  const pwHtml = user
    ? `
    <div class="privacy-card">
      <div class="privacy-head">🔑 ${t("pw_update")}</div>
      <p class="setting-desc">${t("pw_desc")}</p>
      <input id="pw-cur" class="settings-input" type="password" placeholder="${t("pw_current")}" autocomplete="current-password" />
      <input id="pw-new" class="settings-input" type="password" placeholder="${t("pw_new")}" autocomplete="new-password" />
      <input id="pw-confirm" class="settings-input" type="password" placeholder="${t("pw_confirm")}" autocomplete="new-password" />
      <p class="auth-error hidden" id="pw-error-s"></p>
      <button type="button" class="btn btn-accent" id="pw-update-btn">${t("pw_update")}</button>
    </div>`
    : "";

  content.innerHTML = `
    <h3 class="settings-h3">${t("sec_privacy")}</h3>
    ${pinHtml}
    ${pwHtml}`;

  const errPin = (msg) => {
    const el = $("#pin-error-s");
    el.textContent = msg;
    el.classList.toggle("hidden", !msg);
  };
  const validPin = (v) => /^\d{4}$/.test(v);

  const enableBtn = $("#pin-enable-btn");
  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      const a = $("#pin-new").value.trim();
      const b = $("#pin-confirm").value.trim();
      if (!validPin(a)) return errPin(t("pin_new"));
      if (a !== b) return errPin(t("pw_confirm"));
      const salt = randomSalt();
      updateActiveProfile({ pinSalt: salt, pinHash: await hashPassword(a, salt) });
      showToast("🔒 " + t("pin_enable"));
      renderSettings("privacy");
    });
  }
  const changeBtn = $("#pin-change-btn");
  if (changeBtn) {
    changeBtn.addEventListener("click", async () => {
      const cur = $("#pin-cur").value.trim();
      const curHash = await hashPassword(cur, profile.pinSalt || "");
      if (curHash !== profile.pinHash) return errPin(t("pin_current"));
      const a = $("#pin-new").value.trim();
      const b = $("#pin-confirm").value.trim();
      if (!validPin(a)) return errPin(t("pin_new"));
      if (a !== b) return errPin(t("pw_confirm"));
      const salt = randomSalt();
      updateActiveProfile({ pinSalt: salt, pinHash: await hashPassword(a, salt) });
      showToast(t("pin_change") + " ✓");
      renderSettings("privacy");
    });
  }
  const disableBtn = $("#pin-disable-btn");
  if (disableBtn) {
    disableBtn.addEventListener("click", async () => {
      const cur = $("#pin-cur").value.trim();
      const curHash = await hashPassword(cur, profile.pinSalt || "");
      if (curHash !== profile.pinHash) return errPin(t("pin_current"));
      updateActiveProfile({ pinSalt: null, pinHash: null });
      showToast(t("pin_disable") + " ✓");
      renderSettings("privacy");
    });
  }

  const pwUpdateBtn = $("#pw-update-btn");
  if (pwUpdateBtn) {
    pwUpdateBtn.addEventListener("click", async () => {
      const err = (m) => {
        const el = $("#pw-error-s");
        el.textContent = m;
        el.classList.toggle("hidden", !m);
      };
      const cur = $("#pw-cur").value;
      const nw = $("#pw-new").value;
      const cf = $("#pw-confirm").value;
      const curHash = await hashPassword(cur, user.salt);
      if (curHash !== user.passHash) return err(t("pw_current"));
      if (nw.length < 6) return err(t("auth_pass_min"));
      if (nw !== cf) return err(t("pw_confirm"));
      const users = getUsers();
      const u = users.find((x) => x.id === user.id);
      u.salt = randomSalt();
      u.passHash = await hashPassword(nw, u.salt);
      saveUsers(users);
      showToast(t("pw_update") + " ✓");
      renderSettings("privacy");
    });
  }
}

function openGate() {
  $("#avatar-menu").classList.add("hidden");
  gateEditing = false;
  renderGate(false);
}

function getTrackStore() {
  try {
    return JSON.parse(localStorage.getItem(pKey(LS_TRACK))) || {};
  } catch {
    return {};
  }
}

function getTrack(id) {
  return getTrackStore()[String(id)] || { status: "", rating: 0 };
}

function setTrackEntry(id, patch, meta) {
  const store = getTrackStore();
  const cur = store[String(id)] || { status: "", rating: 0 };
  store[String(id)] = { ...cur, ...patch };
  if (meta) {
    store[String(id)].title = meta.title;
    store[String(id)].poster_path = meta.poster_path;
    store[String(id)].media_type = meta.media_type;
  }
  if (!store[String(id)].status && !store[String(id)].rating) delete store[String(id)];
  localStorage.setItem(pKey(LS_TRACK), JSON.stringify(store));
}

function initProfiles() {
  const profiles = getProfiles();
  if (!profiles.length) {
    const legacyList =
      localStorage.getItem(`${LS_LIST}_p_main`) || localStorage.getItem(LS_LIST);
    const legacyProgress =
      localStorage.getItem(`${LS_PROGRESS}_p_main`) || localStorage.getItem(LS_PROGRESS);
    if (legacyList || legacyProgress) {
      saveProfiles([{ id: "p_main", name: "Main", g: 0 }]);
      if (legacyList) localStorage.setItem(`${LS_LIST}_p_main`, legacyList);
      if (legacyProgress) localStorage.setItem(`${LS_PROGRESS}_p_main`, legacyProgress);
      localStorage.removeItem(LS_LIST);
      localStorage.removeItem(LS_PROGRESS);
    }
  }
  renderGate(false);
}

function renderGate(openAddForm) {
  const profiles = getProfiles();
  const grid = $("#profile-grid");
  grid.innerHTML = "";
  grid.classList.toggle("gate-editing", gateEditing);

  profiles.forEach((p) => {
    const tile = document.createElement("button");
    tile.className = "profile-item";
    tile.innerHTML = `
      <span class="profile-box">
        <span class="profile-initial">${escapeHtml((p.name || "?")[0].toUpperCase())}</span>
        <span class="profile-delete" title="Delete profile">✕</span>
        <span class="profile-pencil" title="Edit profile">✎</span>
      </span>
      <span class="profile-label">${escapeHtml(p.name)}</span>`;
    const boxEl = tile.querySelector(".profile-box");
    const tileBg = avatarBackground(p);
    if (tileBg) {
      tile.querySelector(".profile-initial").style.display = "none";
      boxEl.style.background = tileBg;
    } else {
      boxEl.style.background = AVATAR_GRADIENTS[(p.g ?? 0) % AVATAR_GRADIENTS.length];
    }
    if (p.pinHash) {
      const lock = document.createElement("span");
      lock.className = "profile-lock";
      lock.textContent = "🔒";
      boxEl.appendChild(lock);
    }
    tile.addEventListener("click", () => {
      if (gateEditing) {
        openProfileEditor(p.id);
        return;
      }
      if (p.pinHash) showPinScreen(p);
      else enterApp(p.id);
    });
    tile.querySelector(".profile-pencil").addEventListener("click", (e) => {
      e.stopPropagation();
      openProfileEditor(p.id);
    });
    tile.querySelector(".profile-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Delete profile “${p.name}” and all of its saved data?`)) {
        deleteProfile(p.id);
      }
    });
    grid.appendChild(tile);
  });

  const addTile = document.createElement("button");
  addTile.className = "profile-item add-tile";
  addTile.innerHTML = `
    <span class="profile-box"><span class="profile-initial">＋</span></span>
    <span class="profile-label">＋</span>`;
  addTile.addEventListener("click", () => openProfileEditor(null));
  grid.appendChild(addTile);

  $("#profile-gate").classList.remove("hidden");
  $("#gate-manage").textContent = gateEditing ? t("cancel") : t("gate_manage");
  $("#add-profile-panel").classList.add("hidden");
}

function openProfileEditor(profileId) {
  const panel = $("#add-profile-panel");
  const profiles = getProfiles();
  const existing = profileId ? profiles.find((p) => p.id === profileId) : null;
  editingProfileId = profileId;

  editorState = existing
    ? {
        type: existing.avatar?.type === "dice" || existing.avatar?.type === "custom" ? existing.avatar.type : "color",
        g: existing.g ?? 0,
        style: existing.avatar?.style || DICE_STYLES[0],
        seed: existing.avatar?.seed || randomSeed(),
        data: existing.avatar?.data || null,
      }
    : { type: "dice", g: Math.floor(Math.random() * AVATAR_GRADIENTS.length), style: DICE_STYLES[Math.floor(Math.random() * DICE_STYLES.length)], seed: randomSeed(), data: null };

  panel.classList.remove("hidden");
  panel.innerHTML = `
    <h2>${existing ? t("profile_edit_title") : t("profile_add_title")}</h2>
    <input id="editor-name" type="text" maxlength="20" placeholder="${t("profile_name_ph")}" autocomplete="off" spellcheck="false" value="${existing ? escapeHtml(existing.name) : ""}" />
    <div class="editor-tabs">
      <button type="button" data-avtab="colors" class="${editorState.type === "color" ? "active" : ""}">${t("tab_colors")}</button>
      <button type="button" data-avtab="avatars" class="${editorState.type === "dice" ? "active" : ""}">${t("tab_avatars")}</button>
      <button type="button" data-avtab="custom" class="${editorState.type === "custom" ? "active" : ""}">${t("tab_custom")}</button>
    </div>
    <div class="swatch-row" id="editor-colors"></div>
    <div class="avatar-grid-wrap ${editorState.type === "dice" ? "" : "hidden"}" id="editor-avatars">
      <div class="avatar-grid" id="avatar-grid"></div>
      <button type="button" class="link-btn" id="random-avatar-btn">${t("btn_random")}</button>
    </div>
    <div class="custom-upload ${editorState.type === "custom" ? "" : "hidden"}" id="editor-custom">
      <div class="avatar-choice custom-preview ${editorState.type === "custom" && editorState.data ? "has-img" : ""}" id="custom-preview">
        ${editorState.type === "custom" && editorState.data ? `<img src="${editorState.data}" alt="" />` : "＋"}
      </div>
      <label class="btn btn-ghost file-btn" for="custom-file">${t("btn_upload")}</label>
      <input type="file" id="custom-file" accept="image/*" hidden />
    </div>
    <div class="panel-actions">
      ${
        existing
          ? `<button type="button" class="btn btn-ghost" id="editor-delete">${t("profile_delete")}</button>`
          : ""
      }
      <button type="button" class="btn btn-ghost" id="editor-cancel">${t("profile_cancel")}</button>
      <button type="button" class="btn btn-accent" id="editor-save">${t("profile_save")}</button>
    </div>`;

  renderEditorColors();
  renderEditorAvatars();
  wireCustomUpload();

  panel.querySelectorAll(".editor-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      const map = { colors: "color", avatars: "dice", custom: "custom" };
      editorState.type = map[b.dataset.avtab] || "color";
      panel.querySelectorAll(".editor-tabs button").forEach((x) =>
        x.classList.toggle("active", x === b)
      );
      $("#editor-colors").classList.toggle("hidden", editorState.type !== "color");
      $("#editor-avatars").classList.toggle("hidden", editorState.type !== "dice");
      $("#editor-custom").classList.toggle("hidden", editorState.type !== "custom");
    })
  );
  $("#random-avatar-btn").addEventListener("click", () => {
    editorState.style = DICE_STYLES[Math.floor(Math.random() * DICE_STYLES.length)];
    editorState.seed = randomSeed();
    renderEditorAvatars();
  });
  $("#editor-cancel").addEventListener("click", () => {
    panel.classList.add("hidden");
  });
  $("#editor-save").addEventListener("click", saveProfileEditor);
  const delBtn = $("#editor-delete");
  if (delBtn) {
    delBtn.addEventListener("click", () => {
      if (confirm(`Delete profile “${existing.name}” and all of its saved data?`)) {
        deleteProfile(existing.id);
      }
    });
  }
  $("#editor-name").focus();
}

function renderEditorColors() {
  const wrap = $("#editor-colors");
  wrap.innerHTML = "";
  wrap.classList.toggle("hidden", editorState.type !== "color");
  AVATAR_GRADIENTS.forEach((g, i) => {
    const s = document.createElement("button");
    s.type = "button";
    s.className = "swatch" + (editorState.type === "color" && editorState.g === i ? " active" : "");
    s.style.background = g;
    s.addEventListener("click", () => {
      editorState.type = "color";
      editorState.g = i;
      renderEditorColors();
    });
    wrap.appendChild(s);
  });
}

function renderEditorAvatars() {
  const grid = $("#avatar-grid");
  grid.innerHTML = "";
  grid.classList.remove("hidden");
  const seeds = [editorState.seed, ...Array.from({ length: 7 }, (_, i) => `${editorState.seed}${i}`)];
  seeds.forEach((seed, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const url = diceUrl(editorState.style, seed);
    btn.className =
      "avatar-choice" +
      (editorState.type === "dice" && i === 0 ? " active" : "");
    btn.style.background = `url("${url}") center / cover no-repeat`;
    btn.addEventListener("click", () => {
      editorState.type = "dice";
      editorState.seed = seed;
      grid.querySelectorAll(".avatar-choice").forEach((x, xi) =>
        x.classList.toggle("active", xi === i)
      );
    });
    grid.appendChild(btn);
  });
}

function wireCustomUpload() {
  const input = $("#custom-file");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      editorState.type = "custom";
      editorState.data = await fileToAvatarDataUrl(file);
      const preview = $("#custom-preview");
      preview.classList.add("has-img");
      preview.innerHTML = `<img src="${editorState.data}" alt="" />`;
    } catch {
      showToast("⚠ " + t("tab_custom"));
    }
    input.value = "";
  });
}

async function saveProfileEditor() {
  const nameInput = $("#editor-name");
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  const profiles = getProfiles();
  if (editingProfileId) {
    const p = profiles.find((x) => x.id === editingProfileId);
    if (p) {
      p.name = name.slice(0, 20);
      p.g = editorState.g ?? 0;
      delete p.avatar;
      if (editorState.type === "dice") p.avatar = { type: "dice", style: editorState.style, seed: editorState.seed };
      else if (editorState.type === "custom" && editorState.data) p.avatar = { type: "custom", data: editorState.data };
    }
    saveProfiles(profiles);
  } else {
    const profile = {
      id: "p_" + Date.now().toString(36),
      name: name.slice(0, 20),
      g: editorState.g ?? 0,
      lang: lang(),
      autoplay: true,
    };
    if (editorState.type === "dice") profile.avatar = { type: "dice", style: editorState.style, seed: editorState.seed };
    else if (editorState.type === "custom" && editorState.data) profile.avatar = { type: "custom", data: editorState.data };
    profiles.push(profile);
    saveProfiles(profiles);
  }
  applyProfileChrome();
  $("#add-profile-panel").classList.add("hidden");
  renderGate(false);
}

function deleteProfile(id) {
  saveProfiles(getProfiles().filter((p) => p.id !== id));
  localStorage.removeItem(`${LS_LIST}_${id}`);
  localStorage.removeItem(`${LS_PROGRESS}_${id}`);
  if (localStorage.getItem(LS_SESSION) === id) localStorage.removeItem(LS_SESSION);
  renderGate(false);
}

function enterApp(id) {
  localStorage.setItem(LS_SESSION, id);
  $("#profile-gate").classList.add("hidden");
  $("#pin-screen").classList.add("hidden");
  applyProfileChrome();
  applyI18n();
  closeModal();
  $("#search-results").classList.add("hidden");
  $("#search-input").value = "";
  $("#rows").classList.remove("hidden");
  if (appStarted) {
    currentFilter = "home";
    document.querySelectorAll(".nav-links a").forEach((a) =>
      a.classList.toggle("active", a.dataset.filter === "home")
    );
  }
  if (!apiKey) showSetup(false);
  else startApp();
}

let pinTarget = null;

function showPinScreen(profile) {
  pinTarget = profile;
  $("#profile-gate").classList.add("hidden");
  $("#pin-screen").classList.remove("hidden");
  $("#pin-sub").textContent = `“${profile.name}”`;
  buildCodeRow($("#pin-row"), 4, checkPin);
  authErrorPin("");
}

function buildCodeRow(rowEl, digits, onFull, masked = true) {
  rowEl.innerHTML = "";
  for (let i = 0; i < digits; i++) {
    const box = document.createElement("input");
    box.className = "code-box";
    box.type = masked ? "password" : "text";
    box.inputMode = "numeric";
    box.maxLength = 1;
    box.autocomplete = "off";
    box.setAttribute("aria-label", `Digit ${i + 1}`);
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      if (box.value && i < digits - 1) rowEl.children[i + 1].focus();
      if (collectDigits(rowEl).length === digits) onFull(collectDigits(rowEl));
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        rowEl.children[i - 1].focus();
        rowEl.children[i - 1].value = "";
        e.preventDefault();
      }
    });
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, digits);
      pasted.split("").forEach((d, di) => {
        if (rowEl.children[di]) rowEl.children[di].value = d;
      });
      rowEl.children[Math.min(pasted.length, digits - 1)]?.focus();
      if (pasted.length === digits) onFull(pasted);
    });
    rowEl.appendChild(box);
  }
  rowEl.querySelector(".code-box")?.focus();
}

function collectDigits(rowEl) {
  return Array.from(rowEl.children)
    .map((b) => b.value || "")
    .join("");
}

async function checkPin(pin) {
  if (!pinTarget) return;
  const hash = await hashPassword(pin, pinTarget.pinSalt || "");
  if (hash !== pinTarget.pinHash) {
    authErrorPin("Incorrect PIN. Try again.");
    $("#pin-row")
      .querySelectorAll(".code-box")
      .forEach((b) => (b.value = ""));
    $("#pin-row").querySelector(".code-box")?.focus();
    return;
  }
  const target = pinTarget;
  pinTarget = null;
  enterApp(target.id);
}

function authErrorPin(msg) {
  const el = $("#pin-error");
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

function applyProfileChrome() {
  const profile = getProfiles().find((p) => p.id === localStorage.getItem(LS_SESSION));
  renderAvatarInto($("#nav-avatar"), profile);
}

function wireProfileGate() {
  $("#gate-manage").addEventListener("click", () => {
    gateEditing = !gateEditing;
    $("#add-profile-panel").classList.add("hidden");
    renderGate(false);
  });
  $("#pin-cancel").addEventListener("click", () => {
    pinTarget = null;
    authErrorPin("");
    $("#pin-screen").classList.add("hidden");
    $("#profile-gate").classList.remove("hidden");
  });
}

function getList() {
  try {
    return JSON.parse(localStorage.getItem(pKey(LS_LIST))) || [];
  } catch {
    return [];
  }
}

function inList(id) {
  return getList().some((i) => i.id === Number(id));
}

function toggleList(item) {
  let list = getList();
  const exists = list.some((i) => i.id === item.id);
  if (exists) {
    list = list.filter((i) => i.id !== item.id);
    showToast(`Removed “${item.title}” from your list`);
  } else {
    list.unshift(item);
    showToast(`Added “${item.title}” to your list`);
  }
  localStorage.setItem(pKey(LS_LIST), JSON.stringify(list.slice(0, 50)));
  refreshBookmarkButtons();
  if (currentFilter === "list" && $("#search-results").classList.contains("hidden")) {
    renderRows("list");
  }
}

function refreshBookmarkButtons() {
  document.querySelectorAll(".card").forEach((card) => {
    const btn = card.querySelector(".bookmark-btn");
    if (btn) btn.classList.toggle("active", inList(card.dataset.id));
  });
}

function showToast(msg) {
  const root = $("#toast-root");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function setupSearch() {
  const input = $("#search-input");
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      exitSearch();
      return;
    }
    searchTimer = setTimeout(() => runSearch(q), 400);
  });
}

async function runSearch(query) {
  let data;
  try {
    data = await tmdb("/search/multi", { query, include_adult: false, language: "en-US" });
  } catch (err) {
    handleFetchError(err);
    return;
  }
  const results = data.results
    .map((r) => normalizeItem(r))
    .filter((r) => r.poster_path);

  const section = $("#search-results");
  section.classList.remove("hidden");
  $("#hero").classList.add("hidden");
  $("#rows").classList.add("hidden");

  if (!results.length) {
    section.innerHTML = `
      <h2 class="results-title">Results for “${escapeHtml(query)}”</h2>
      <p class="results-sub">0 titles found</p>
      <div class="empty-state"><h2>No matches found</h2><p>Try a different title, person, or keyword.</p></div>`;
    return;
  }

  section.innerHTML = `
    <h2 class="results-title">Results for “${escapeHtml(query)}”</h2>
    <p class="results-sub">${results.length} titles found</p>
    <div class="results-grid"></div>`;
  section.querySelector(".results-grid").innerHTML = results.map(cardHTML).join("");
}

function exitSearch() {
  $("#search-input").value = "";
  $("#search-results").classList.add("hidden");
  $("#rows").classList.remove("hidden");
  if (currentFilter !== "list") {
    $("#hero").classList.remove("hidden");
  }
}

function setupGlobalClickDelegation() {
  document.addEventListener("click", (e) => {
    const bookmark = e.target.closest(".bookmark-btn");
    if (bookmark) {
      e.stopPropagation();
      const card = bookmark.closest(".card");
      const item = getList().find((i) => i.id === Number(card.dataset.id));
      const fallback = {
        id: Number(card.dataset.id),
        media_type: card.dataset.type,
        title: card.querySelector(".card-title")?.textContent || "Unknown",
        poster_path: null,
        backdrop_path: null,
        vote_average: 0,
        date: "",
        overview: "",
      };
      toggleListFromCard(card, item || fallback);
      return;
    }
    const card = e.target.closest(".card");
    if (card) {
      openDetail(card.dataset.type, card.dataset.id, false);
    }
  });
}

function toggleListFromCard(card, item) {
  const exists = inList(item.id);
  if (!exists) {
    const imgEl = card.querySelector(".card-poster");
    if (imgEl && imgEl.src.includes("image.tmdb.org")) {
      item.poster_path = "/" + imgEl.src.split("/t/p/")[1]?.split("/")[1];
    }
  }
  toggleList(item);
}

function showSetup(isRetry) {
  const overlay = $("#setup-overlay");
  overlay.classList.remove("hidden");
  if (isRetry) $("#api-key-error").classList.remove("hidden");
  const input = $("#api-key-input");
  input.focus();

  const save = async () => {
    const key = input.value.trim();
    if (!key) return;
    try {
      const res = await fetch(`${API_BASE}/configuration?api_key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error();
      apiKey = key;
      localStorage.setItem(LS_KEY, key);
      overlay.classList.add("hidden");
      startApp();
    } catch {
      $("#api-key-error").classList.remove("hidden");
    }
  };
  $("#api-key-save").onclick = save;
  input.onkeydown = (e) => {
    if (e.key === "Enter") save();
  };
}

function setupNav() {
  window.addEventListener("scroll", () => {
    $("#navbar").classList.toggle("scrolled", window.scrollY > 40);
  });
  document.querySelectorAll(".nav-links a, #nav-home").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      exitSearch();
      setFilter(a.dataset.filter || "home");
      window.scrollTo(0, 0);
    });
  });
}

window.addEventListener("message", function (event) {
  if (typeof event.data !== "string") return;
  let msg = null;
  try {
    msg = JSON.parse(event.data);
  } catch {
    return;
  }
  if (!msg || msg.type !== "PLAYER_EVENT") return;
  const d = msg.data || {};
  if (currentPlayer && d.id && typeof d.currentTime === "number") {
    const store = getWatchStore();
    const prev = store[d.id] || {};
    store[d.id] = {
      t: d.currentTime,
      d: d.duration || prev.d || 0,
      media_type: d.mediaType || currentPlayer.type,
      title: currentPlayer.title || prev.title,
      poster_path: prev.poster_path || currentPlayer.poster_path,
      backdrop_path: prev.backdrop_path || currentPlayer.backdrop_path,
    };
    localStorage.setItem(pKey(LS_PROGRESS), JSON.stringify(store));
  }
  const chip = document.querySelector("#messageArea");
  if (chip) {
    const icons = { play: "▶ ", pause: "⏸ ", ended: "✓ ", seeked: "⏩ ", timeupdate: "" };
    chip.innerText = (icons[d.event] ?? "• ") + fmtTime(d.currentTime) + (d.duration ? " / " + fmtTime(d.duration) : "");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    exitSearch();
  }
});

window.addEventListener("load", () => {
  applyI18n();
  setupNav();
  setupSearch();
  setupGlobalClickDelegation();
  wireProfileGate();
  wireAuth();
  wireAvatarMenu();
  initAuth();
});
