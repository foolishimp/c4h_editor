// file: minimal-test/shell/src/Shell.tsx
import React from 'react';

interface ShellProps {
  children: React.ReactNode;
}

const Shell: React.FC<ShellProps> = ({ children }) => {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <header style={{ 
        padding: '10px 0',
        borderBottom: '1px solid #eaeaea',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
          Microfrontend Test
        </div>
        <nav>
          <a href="#" style={{ 
            margin: '0 10px', 
            color: '#4a90e2', 
            textDecoration: 'none' 
          }}>
            Home
          </a>
          <a href="#" style={{ 
            margin: '0 10px', 
            color: '#4a90e2', 
            textDecoration: 'none' 
          }}>
            About
          </a>
        </nav>
      </header>
      
      <main>
        {children}
      </main>
      
      <footer style={{ 
        marginTop: '40px', 
        padding: '20px 0', 
        borderTop: '1px solid #eaeaea',
        color: '#666',
        textAlign: 'center'
      }}>
        <p>Test Microfrontend Shell with Module Federation</p>
      </footer>
    </div>
  );
};

export default Shell;
