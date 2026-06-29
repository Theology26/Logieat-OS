<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title inertia>LogiEat OS</title>
    {{-- Apply saved theme before paint to avoid a flash of the wrong theme. --}}
    <script>
        try {
            if (localStorage.getItem('logieat-theme') === 'light') {
                document.documentElement.classList.add('light');
            }
        } catch (e) {}
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>
<body class="font-sans antialiased">
    @inertia
</body>
</html>
