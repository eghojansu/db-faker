<?php

namespace model;

use Exception;
use PDO;

class Db {
    private $pdo;
    private $config;
    private $databases;
    private $currentDbName;
    private $tables;

    public function __construct(array $config) {
        $this->config = $config + [
            'username'=>null,
            'password'=>null,
            'host'=>null,
            'ignores'=>[],
        ];
    }

    public function getPdo() {
        if (!$this->pdo) {
            try {
                $config = $this->config;
                $dsn = "mysql:host=$config[host]";
                $this->pdo = new PDO($dsn, $config['username'], $config['password']);
            } catch (Exception $e) {
                die('Your database configuration was invalid, please re-check');
            }
        }

        return $this->pdo;
    }

    public function showDatabases() {
        if (!$this->databases) {
            $query = $this->getPdo()->query('SHOW DATABASES', PDO::FETCH_COLUMN, 0);
            $this->databases = $query->fetchAll();

            foreach ($this->databases as $key => $db) {
                if (in_array($db, $this->config['ignores'])) {
                    unset($this->databases[$key]);
                }
            }
        }

        return $this->databases;
    }

    public function showTables($dbname) {
        if ($this->currentDbName != $dbname) {
            if (!$this->tables) {
                if (!$this->databases) {
                    $this->showDatabases();
                }
                if (!in_array($dbname, $this->databases)) {
                    return [];
                }

                $query = $this->getPdo()->query("SHOW TABLES FROM $dbname", PDO::FETCH_COLUMN, 0);
                $this->tables = $query->fetchAll();
            }
        }

        return $this->tables;
    }

    public function showColumns($dbname, array $tables) {
        $columns = [];

        if (!$this->tables) {
            $this->showTables($dbname);
        }

        $this->getPdo();
        foreach ($tables as $table) {
            if (!in_array($table, $this->tables)) {
                return [];
            }

            $query = $this->pdo->query("SHOW COLUMNS FROM $dbname.$table");
            $columns[$table] = $this->extractColumns($query->fetchAll(PDO::FETCH_ASSOC));
        }

        return $columns;
    }

    private function extractColumns(array $result) {
        $newResult = [];

        foreach ($result as $key => $value) {
            $newResult[$key] = [
                'name'=>$value['Field'],
                'nullable'=>strtolower($value['Null'])==='yes',
                'index'=>$value['Key'],
                'default'=>$value['Default'],
                'auto'=>$value['Extra']==='auto_increment',
            ] + $this->extractType($value);
        }

        return $newResult;
    }

    private function extractType(array $value) {
        $pattern = '/^(\w+)(\((.+)\))?/';
        preg_match($pattern, $value['Type'], $matches);
        $result = [];

        $result['original_type'] = $matches[1];
        $result['length'] = isset($matches[3]) ? $matches[3] : null;
        switch (strtolower($matches[1])) {
            case 'bit':
            case 'tinyint':
            case 'smallint':
            case 'mediumint':
            case 'int':
            case 'integer':
            case 'bigint':
            case 'numeric':
                $result['type'] = 'int';
                break;
            case 'real':
            case 'double':
            case 'float':
            case 'decimal':
                $result['type'] = 'decimal';
                break;
            case 'date':
                $result['type'] = 'date';
                break;
            case 'time':
                $result['type'] = 'time';
                break;
            case 'timestamp':
            case 'datetime':
                $result['type'] = 'datetime';
                break;
            case 'year':
                $result['type'] = 'year';
                break;
            case 'enum':
            case 'set':
                $result['type'] = 'enum';
                break;
            case 'char':
            case 'json':
            case 'varchar':
            case 'tinytext':
            case 'text':
            case 'mediumtext':
            case 'longtext':
                $result['type'] = 'string';
                break;
            // case 'binary':
            // case 'varbinary':
            // case 'tinyblob':
            // case 'blob':
            // case 'mediumblob':
            // case 'longblob':
            default:
                $result['type'] = $matches[1];
                break;
        }

        return $result;
    }
}
