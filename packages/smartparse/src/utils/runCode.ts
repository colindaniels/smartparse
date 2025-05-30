import { createRequire } from 'module';
import vm from 'vm';

// Create a require function to enable ES6 imports
const require = createRequire(import.meta.url);



interface Options {
    html: string,
    code: string
}


export async function runCode(options: Options): Promise<any> {

    const script = new vm.Script(options.code, { filename: 'test.js' });

    const context = vm.createContext({
        console,
        require,
        html: options.html
      });
    
      const codeOutput = script.runInContext(context);

      return codeOutput


}