import { useForm, Head } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '' });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="min-h-screen grid place-items-center bg-bg px-4">
            <Head title="Masuk" />
            <form onSubmit={submit} className="w-[360px] bg-card border border-line rounded-2xl p-7">
                <div className="text-accentt font-semibold text-sm">LogiEat OS</div>
                <h1 className="text-2xl font-semibold mt-1">Masuk</h1>
                <p className="text-ink2 text-sm mt-1 mb-5">Dashboard katering.</p>

                <Field label="Email" type="email" value={data.email} onChange={(v) => setData('email', v)} error={errors.email} />
                <Field label="Kata sandi" type="password" value={data.password} onChange={(v) => setData('password', v)} error={errors.password} />

                <button
                    disabled={processing}
                    className="mt-6 w-full h-12 rounded-full bg-accent hover:bg-accenth text-[#1a1206] font-semibold transition disabled:opacity-60"
                >
                    {processing ? 'Memproses…' : 'Masuk'}
                </button>
            </form>
        </div>
    );
}

function Field({ label, type, value, onChange, error }) {
    return (
        <div className="mt-4">
            <label className="block text-xs text-ink2 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-12 px-3 rounded-lg bg-pop border border-line2 text-ink outline-none focus:border-accent transition"
            />
            {error && <div className="text-danger text-xs mt-1">{error}</div>}
        </div>
    );
}
