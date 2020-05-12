import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import postcss from 'rollup-plugin-postcss';
import {terser} from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/main.js',
    plugins: [
        postcss({
            extract: true,
            extract: 'bundle.css',
            modules: true,
            use: ['sass'],
        }),
        resolve({
            browser: true,
            dedupe: ['three'],
        }),
        commonjs(),
        !production && serve(),
        !production && livereload('src'),
        production && terser(),
    ],
    output: [
        {
            file: 'dist/bundle.min.js',
            name: 'app',
            format: 'iife',
            sourcemap: true,
        }
    ],
    watch: {
        clearScreen: false
    }
};

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
					stdio: ['ignore', 'inherit', 'inherit'],
					shell: true
				});
			}
		}
	};
}