# numpy-only stand-ins for the few scipy.signal / scipy.ndimage calls of this pipeline (scipy is not installed on this
# machine). IIR filters are applied EXACTLY in the frequency domain: the digital transfer function B(z)/A(z) is
# evaluated on an FFT grid long enough for the impulse response to decay (causal, same result as lfilter up to
# ~-140 dB). Butterworth sections are designed with the bilinear transform (orders 1-2; band-pass = HP x LP cascade).
import numpy as np
from types import SimpleNamespace


def _nfft(n):
    return 1 << int(np.ceil(np.log2(max(int(n), 2))))


def _H(b, a, nfft):
    z1 = np.exp(-2j * np.pi * np.fft.rfftfreq(nfft))          # z^-1 on the rfft grid
    return np.polyval(np.asarray(b, float)[::-1], z1) / np.polyval(np.asarray(a, float)[::-1], z1)


def _tail(sections):
    r = 0.0
    for _, a in sections:
        if len(a) > 1:
            r = max(r, float(np.max(np.abs(np.roots(a)))))
    r = min(r, 0.9999995)
    if r <= 1e-9:
        return 64
    return int(min(np.log(1e-7) / np.log(r), 48000 * 8)) + 64


def _filt(sections, x, zero_phase=False):
    x = np.asarray(x, float)
    n = x.shape[-1]
    tail = _tail(sections)
    pre = tail if zero_phase else 0
    nfft = _nfft(n + tail + pre)
    H = np.ones(nfft // 2 + 1, complex)
    for b, a in sections:
        H *= _H(b, a, nfft)
    if zero_phase:
        H = np.abs(H) ** 2
        xp = np.zeros(x.shape[:-1] + (nfft,))
        xp[..., pre:pre + n] = x
        y = np.fft.irfft(np.fft.rfft(xp, axis=-1) * H, nfft, axis=-1)
        return y[..., pre:pre + n]
    return np.fft.irfft(np.fft.rfft(x, nfft, axis=-1) * H, nfft, axis=-1)[..., :n]


def _lp1(K):
    return [K / (1 + K), K / (1 + K)], [1.0, (K - 1) / (K + 1)]


def _hp1(K):
    return [1 / (1 + K), -1 / (1 + K)], [1.0, (K - 1) / (K + 1)]


def _lp2(K):
    q = np.sqrt(2.0)
    nm = 1 / (1 + q * K + K * K)
    return [K * K * nm, 2 * K * K * nm, K * K * nm], [1.0, 2 * (K * K - 1) * nm, (1 - q * K + K * K) * nm]


def _hp2(K):
    q = np.sqrt(2.0)
    nm = 1 / (1 + q * K + K * K)
    return [nm, -2 * nm, nm], [1.0, 2 * (K * K - 1) * nm, (1 - q * K + K * K) * nm]


def butter(order, Wn, btype="lowpass", fs=None, output="sos"):
    """Butterworth (order 1 or 2, higher orders = cascades of 2nd order) -> list of (b, a) sections"""
    fs = fs if fs is not None else 2.0                      # scipy convention: Wn relative to Nyquist when fs is None
    K = lambda f: np.tan(np.pi * min(float(f), fs * 0.4999) / fs)

    def chain(kind, f):
        out = []
        o = order
        while o > 0:
            if o >= 2:
                out.append((_lp2 if kind == "low" else _hp2)(K(f)))
                o -= 2
            else:
                out.append((_lp1 if kind == "low" else _hp1)(K(f)))
                o -= 1
        return out
    if btype in ("lowpass", "low"):
        return chain("low", Wn)
    if btype in ("highpass", "high"):
        return chain("high", Wn)
    if btype in ("bandpass", "band"):
        return chain("high", Wn[0]) + chain("low", Wn[1])
    raise ValueError(btype)


def sosfilt(sos, x, axis=-1):
    return _filt(sos, x)


def sosfiltfilt(sos, x, axis=-1):
    return _filt(sos, x, zero_phase=True)


def lfilter(b, a, x, axis=-1):
    a = np.asarray(a, float)
    b = np.asarray(b, float) / a[0]
    return _filt([(b, a / a[0])], x)


def fftconvolve(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    n = a.shape[-1] + b.shape[-1] - 1
    nf = _nfft(n)
    return np.fft.irfft(np.fft.rfft(a, nf) * np.fft.rfft(b, nf), nf)[:n]


_UP = {}


def _interp_filter(L, taps=32):
    if L not in _UP:
        M = L * taps + 1
        k = np.arange(M) - (M - 1) / 2
        h = np.sinc(k / L) * np.kaiser(M, 8.0)
        h *= L / h.sum()
        _UP[L] = h
    return _UP[L]


def resample_poly(x, up, down=1, axis=-1):
    """integer up-sampling (down must be 1) by a polyphase Kaiser-windowed sinc, centred like scipy"""
    assert down == 1
    x = np.atleast_2d(np.asarray(x, float))
    h = _interp_filter(up)
    M = len(h)
    D = (M - 1) // 2
    hp_ = np.concatenate([h, np.zeros((-M) % up)])
    n = x.shape[-1]
    out = np.zeros((x.shape[0], n * up))
    for c in range(x.shape[0]):
        y = np.zeros((n + len(hp_) // up) * up)
        for p in range(up):
            yp = fftconvolve(x[c], hp_[p::up])
            y[p::up][: len(yp)] = yp[: len(y[p::up])]
        out[c] = y[D: D + n * up]
    return out


signal = SimpleNamespace(butter=butter, sosfilt=sosfilt, sosfiltfilt=sosfiltfilt, lfilter=lfilter, fftconvolve=fftconvolve,
                         resample_poly=resample_poly)


def uniform_filter1d(x, size, mode="nearest"):
    x = np.asarray(x, float)
    size = max(1, int(size))
    lo = size // 2
    hi = size - 1 - lo
    xp = np.concatenate([np.full(lo, x[0]), x, np.full(hi, x[-1])])
    c = np.concatenate([[0.0], np.cumsum(xp)])
    return (c[size:] - c[:-size]) / size


def minimum_filter1d(x, size, mode="nearest"):
    """centred sliding minimum (van Herk / Gil-Werman, vectorized)"""
    x = np.asarray(x, float)
    w = max(1, int(size))
    if w == 1:
        return x.copy()
    lo = w // 2
    hi = w - 1 - lo
    xp = np.concatenate([np.full(lo, x[0]), x, np.full(hi, x[-1])])
    n = len(xp)
    m = -(-n // w) * w
    xb = np.concatenate([xp, np.full(m - n, np.inf)]).reshape(-1, w)
    g = np.minimum.accumulate(xb, axis=1).ravel()
    h = np.minimum.accumulate(xb[:, ::-1], axis=1)[:, ::-1].ravel()
    i = np.arange(len(x))
    return np.minimum(h[i], g[i + w - 1])


ndimage = SimpleNamespace(uniform_filter1d=uniform_filter1d, minimum_filter1d=minimum_filter1d)
